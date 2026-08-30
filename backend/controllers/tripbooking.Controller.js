import { handleRpcError, settleOverdue, startPayment } from '../lib/bookingPayment.js';
import { expireInvoice } from '../lib/xendit.js';

const BOOKING_FIELDS = `
    id, trip_id, booking_code, total_price,
    payment_status, payment_method,
    invoice_url, invoice_expires_at, created_at, paid_at,
    flight_bookings ( id, booking_code, total_price, payment_status ),
    accommodation_bookings (
      id, booking_code, total_price, payment_status,
      accommodation_booking_rooms ( id, room_name, check_in, check_out, guests, nights, subtotal )
    )
`;

// GET /api/trip-bookings/:id
export const getTripBooking = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('trip_bookings')
      .select(BOOKING_FIELDS)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'Booking not found' });
    }

    // Sama seperti booking lain: tenggat yang lewat ditutup sebelum
    // ditampilkan, supaya pembeli tidak melihat tombol bayar untuk invoice
    // yang sudah mati.
    await settleOverdue(data, 'getTripBooking');

    return res.json({ data });
  } catch (err) {
    console.error('[getTripBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/trip-bookings
export const listTripBookings = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('trip_bookings')
      .select('id, trip_id, booking_code, total_price, payment_status, created_at, paid_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    await settleOverdue(data, 'listTripBookings');

    return res.json({ data });
  } catch (err) {
    console.error('[listTripBookings] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/trip-bookings/:id/pay
// startPayment sudah generik terhadap nama tabel -- trip_bookings punya
// persis kolom yang sama (booking_code, total_price, payment_status,
// invoice_url, invoice_expires_at, created_at, user_id) jadi tidak perlu
// fungsi baru sama sekali di bookingPayment.js.
export const payTripBooking = async (req, res) => {
  try {
    return await startPayment({
      req,
      res,
      table: 'trip_bookings',
      tag: 'payTripBooking',
      describe: (b) => `trip payment ${b.booking_code}`,
    });
  } catch (err) {
    if (err.message === 'XENDIT_CREATE_INVOICE_FAILED') {
      console.error('[payTripBooking] xendit error', err.status, err.detail);
      return res.status(502).json({
        error: 'payment_gateway_error',
        message: 'Failed to create payment invoice.',
      });
    }

    console.error('[payTripBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/trip-bookings/:id/cancel
export const cancelTripBooking = async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await req.db
      .from('trip_bookings')
      .select('booking_code, payment_status, xendit_invoice_id, invoice_expires_at, created_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!booking) {
      return res.status(404).json({ error: 'not_found', message: 'Booking not found' });
    }

    if (booking.payment_status === 'paid') {
      return res.status(409).json({
        error: 'already_paid',
        message: 'Booking already paid, cannot be canceled',
      });
    }

    await settleOverdue(booking, 'cancelTripBooking');

    if (booking.payment_status !== 'pending') {
      return res.status(409).json({
        error: 'booking_not_cancellable',
        message: `Booking dengan status ${booking.payment_status} tidak bisa dibatalkan`,
      });
    }

    // cancel_booking RPC perlu tahu prefix TRP- -- lihat
    // migration_trip_bookings_cancel.sql. Tanpa itu, ini akan gagal dengan
    // UNKNOWN_BOOKING_CODE.
    const { data, error } = await req.db.rpc('cancel_booking', {
      p_booking_code: booking.booking_code,
      p_user_id: req.user.id,
    });

    if (error) return handleRpcError(res, error, 'cancelTripBooking');

    if (booking.xendit_invoice_id) {
      try {
        await expireInvoice(booking.xendit_invoice_id);
      } catch (expireErr) {
        console.error('[cancelTripBooking] gagal expire invoice', expireErr);
      }
    }

    return res.json({ data });
  } catch (err) {
    console.error('[cancelTripBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};