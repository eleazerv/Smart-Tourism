import { handleRpcError, settleOverdue, startPayment } from '../lib/bookingPayment.js';
import { expireInvoice } from '../lib/xendit.js';

const BOOKING_FIELDS = `
    id, booking_code, check_in, check_out, guests,
    price_per_night, nights, total_price,
    payment_status, payment_method,
    invoice_url, invoice_expires_at, created_at, paid_at,
    accommodations (
      id, name, tier, max_guests, partner_name, cover_image_url,
      latitude, longitude,
      cities ( id, name, provinces ( id, code, name ) )
    )
`;

// POST /api/accommodation-bookings
// Body: { accommodation_id, check_in, check_out, guests }
export const createAccommodationBooking = async (req, res) => {
  try {
    const { accommodation_id, check_in, check_out, guests } = req.body;

    if (!accommodation_id || !check_in || !check_out) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'accommodation_id, check_in, dan check_out wajib diisi',
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(check_in) || !datePattern.test(check_out)) {
      return res.status(400).json({
        error: 'invalid_date',
        message: 'check_in dan check_out harus format YYYY-MM-DD',
      });
    }

    // Jumlah malam dan total harga dihitung di dalam fungsi Postgres
    const { data, error } = await req.db.rpc('create_accommodation_booking', {
      p_user_id: req.user.id,
      p_accommodation_id: accommodation_id,
      p_check_in: check_in,
      p_check_out: check_out,
      p_guests: Number(guests) || 1,
    });

    if (error) return handleRpcError(res, error, 'createAccommodationBooking');

    const { data: booking, error: fetchError } = await req.db
      .from('accommodation_bookings')
      .select(BOOKING_FIELDS)
      .eq('id', data.id)
      .single();

    if (fetchError) throw fetchError;

    return res.status(201).json({ data: booking });
  } catch (err) {
    console.error('[createAccommodationBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/accommodation-bookings/:id
export const getAccommodationBooking = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('accommodation_bookings')
      .select(BOOKING_FIELDS)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Booking tidak ditemukan atau bukan milik Anda',
      });
    }

    // Booking yang tenggatnya sudah lewat ditutup sebelum ditampilkan, supaya
    // pembeli tidak melihat tombol bayar untuk tagihan yang sudah mati.
    await settleOverdue(data, 'getAccommodationBooking');

    return res.json({ data });
  } catch (err) {
    console.error('[getAccommodationBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/accommodation-bookings
export const listAccommodationBookings = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('accommodation_bookings')
      .select(`
        id, booking_code, check_in, check_out, nights, guests,
        total_price, payment_status, invoice_expires_at, created_at, paid_at,
        accommodations ( id, name, tier, cover_image_url )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    await settleOverdue(data, 'listAccommodationBookings');

    return res.json({ data });
  } catch (err) {
    console.error('[listAccommodationBookings] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/accommodation-bookings/:id/pay
export const payAccommodationBooking = async (req, res) => {
  try {
    return await startPayment({
      req,
      res,
      table: 'accommodation_bookings',
      tag: 'payAccommodationBooking',
      describe: (b) => `Pembayaran akomodasi ${b.booking_code} (${b.nights} malam)`,
    });
  } catch (err) {
    if (err.message === 'XENDIT_CREATE_INVOICE_FAILED') {
      console.error('[payAccommodationBooking] xendit error', err.status, err.detail);
      return res.status(502).json({
        error: 'payment_gateway_error',
        message: 'Gagal membuat invoice pembayaran. Coba lagi sebentar lagi.',
      });
    }

    console.error('[payAccommodationBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/accommodation-bookings/:id/cancel
export const cancelAccommodationBooking = async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await req.db
      .from('accommodation_bookings')
      .select('booking_code, payment_status, xendit_invoice_id, invoice_expires_at, created_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!booking) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Booking tidak ditemukan atau bukan milik Anda',
      });
    }

    if (booking.payment_status === 'paid') {
      return res.status(409).json({
        error: 'already_paid',
        message: 'Booking yang sudah dibayar tidak bisa dibatalkan di sini',
      });
    }

    await settleOverdue(booking, 'cancelAccommodationBooking');

    // Kursi/kamar hanya perlu dilepas sekali. Booking yang sudah gagal atau
    // sudah dibatalkan sebelumnya tidak boleh masuk ke cancel_booking lagi.
    if (booking.payment_status !== 'pending') {
      return res.status(409).json({
        error: 'booking_not_cancellable',
        message: `Booking dengan status ${booking.payment_status} tidak bisa dibatalkan`,
      });
    }

    const { data, error } = await req.db.rpc('cancel_booking', {
      p_booking_code: booking.booking_code,
      p_user_id: req.user.id,
    });

    if (error) return handleRpcError(res, error, 'cancelAccommodationBooking');

    if (booking.xendit_invoice_id) {
      try {
        await expireInvoice(booking.xendit_invoice_id);
      } catch (expireErr) {
        console.error('[cancelAccommodationBooking] gagal expire invoice', expireErr);
      }
    }

    return res.json({ data });
  } catch (err) {
    console.error('[cancelAccommodationBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};