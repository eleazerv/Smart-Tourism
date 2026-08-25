import { handleRpcError, startPayment } from "../lib/bookingPayment.js";
import { expireInvoice } from "../lib/xendit.js";

const BOOKING_FIELDS = `
    id, booking_code, total_price, payment_status, payment_method,
    invoice_url, invoice_expires_at, created_at, paid_at,
    flight_booking_items (
      id, flight_type, price,
      flight_options (
        id, airline, flight_number, departure_time, arrival_time,
        origin:origin_city_id ( id, name ),
        destination:destination_city_id ( id, name )
      )
    )
`;

// POST /api/flight-bookings
// Body: { items: [{ flight_option_id, flight_type }] }
export const createFlightBooking = async (req,res) => { 
    try { 
        const {items} = req.body; 

        if(!Array.isArray(items)) { 
            return res.status(400).json({error: 'invalid_body', message: 'items must be an array'});
        }

        const {data, error} = await req.db.rpc('create_flight_booking', { 
            p_user_id: req.user.id, 
            p_items: items 
        });

        if (error) return handleRpcError(res, error, 'createFlightBooking');

        const { data: booking, error: fetchError } = await req.db
        .from('flight_bookings')
        .select(BOOKING_FIELDS)
        .eq('id', data.id)
        .single();

        if (fetchError) throw fetchError;

        return res.status(201).json({ data: booking });
             
    }catch(err) { 
        console.error('[createFlightBooking] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}



// GET /api/flight-bookings/:id
export const getFlightBooking = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('flight_bookings')
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
 
    return res.json({ data });
  } catch (err) {
    console.error('[getFlightBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
 
// GET /api/flight-bookings
export const listFlightBookings = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('flight_bookings')
      .select('id, booking_code, total_price, payment_status, created_at, paid_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
 
    if (error) throw error;
 
    return res.json({ data });
  } catch (err) {
    console.error('[listFlightBookings] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// POST /api/flight-bookings/:id/pay
export const payFlightBooking = async (req, res) => {
  try {
    return await startPayment({
      req,
      res,
      table: 'flight_bookings',
      tag: 'payFlightBooking',
      describe: (b) => `Pembayaran tiket penerbangan ${b.booking_code}`,
    });
  } catch (err) {
    if (err.message === 'XENDIT_CREATE_INVOICE_FAILED') {
      console.error('[payFlightBooking] xendit error', err.status, err.detail);
      return res.status(502).json({
        error: 'payment_gateway_error',
        message: 'Gagal membuat invoice pembayaran. Coba lagi sebentar lagi.',
      });
    }
 
    console.error('[payFlightBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};



// POST /api/flight-bookings/:id/cancel
// Membatalkan booking yang belum dibayar dan mengembalikan kursinya.
export const cancelFlightBooking = async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await req.db
      .from('flight_bookings')
      .select('booking_code, payment_status, xendit_invoice_id')
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
 
    const { data, error } = await req.db.rpc('cancel_booking', {
      p_booking_code: booking.booking_code,
      p_user_id: req.user.id,
    });
 
    if (error) return handleRpcError(res, error, 'cancelFlightBooking');
 
    // Matikan invoice lama supaya link pembayarannya tidak bisa dipakai
    // setelah kursinya dikembalikan. Kegagalan di sini tidak membatalkan
    // pembatalan booking yang sudah tercatat.
    if (booking.xendit_invoice_id) {
      try {
        await expireInvoice(booking.xendit_invoice_id);
      } catch (expireErr) {
        console.error('[cancelFlightBooking] gagal expire invoice', expireErr);
      }
    }
 
    return res.json({ data });
  } catch (err) {
    console.error('[cancelFlightBooking] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};