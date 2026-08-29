import { handleRpcError, startPayment } from '../lib/bookingPayment.js';
import { expireInvoice } from '../lib/xendit.js';

const BOOKING_FIELDS = `
    id, booking_code, total_price,
    payment_status, payment_method,
    invoice_url, invoice_expires_at, created_at, paid_at,
    accommodation_booking_rooms (
      id, room_name, check_in, check_out, guests,
      price_per_night, nights, subtotal,
      accommodations (
        id, name, tier, max_guests, partner_name, cover_image_url,
        latitude, longitude,
        cities ( id, name, provinces ( id, code, name ) )
      )
    )
`;

// POST /api/accommodation-bookings
// Body: { accommodation_id, rooms: [{ check_in, check_out, guests }, ...] }

export const createAccommodationBooking = async (req, res) => {
  try {
    const { accommodation_id, rooms } = req.body;

    if (!accommodation_id) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'accommodation_id msut be filled in',
      });
    }

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'room must be an array with at least one room',
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const r of rooms) {
      if (!r.check_in || !r.check_out || !datePattern.test(r.check_in) || !datePattern.test(r.check_out)) {
        return res.status(400).json({
          error: 'invalid_date',
          message: 'every room must have check_in and check_out',
        });
      }
    }

    // Jumlah malam, nama kamar, dan total harga dihitung di dalam fungsi
    const { data, error } = await req.db.rpc('create_accommodation_booking', {
      p_user_id: req.user.id,
      p_accommodation_id: accommodation_id,
      p_rooms: rooms.map((r) => ({
        check_in: r.check_in,
        check_out: r.check_out,
        guests: Number(r.guests) || 1,
      })),
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
        message: 'Booking not Found ',
      });
    }

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
        id, booking_code, total_price, payment_status, created_at, paid_at,
        accommodation_booking_rooms (
          id, room_name, check_in, check_out, nights,
          accommodations ( id, name, tier, cover_image_url )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

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
      describe: (b) => ` accommodation payment ${b.booking_code}`,
    });
  } catch (err) {
    if (err.message === 'XENDIT_CREATE_INVOICE_FAILED') {
      console.error('[payAccommodationBooking] xendit error', err.status, err.detail);
      return res.status(502).json({
        error: 'payment_gateway_error',
        message: 'Failed to create payment invoice.',
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
      .select('booking_code, payment_status, xendit_invoice_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!booking) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Booking not found',
      });
    }

    if (booking.payment_status === 'paid') {
      return res.status(409).json({
        error: 'already_paid',
        message: 'booking already paid, cannot be canceled',
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
        console.error('[cancelAccommodationBooking] failed , invoice expired ', expireErr);
      }
    }

    return res.json({ data });
  } catch (err) {
    console.error('[cancelAccommodationBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};