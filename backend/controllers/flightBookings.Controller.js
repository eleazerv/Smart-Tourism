import { supabase } from "../lib/supabase.js";
import { handleRpcError, startPayment } from "../lib/bookingPayment.js";
import { expireInvoice } from "../lib/xendit.js";

const BOOKING_FIELDS = `
    id, booking_code, total_price, payment_status, payment_method,
    invoice_url, invoice_expires_at, created_at, paid_at,
    flight_tickets ( id, ticket_code, full_name, booking_item_id ),
    flight_booking_items (
      id, flight_type, price, quantity,
      flight_options (
        id, airline, flight_number, departure_time, arrival_time,
        origin:origin_city_id ( id, name ),
        destination:destination_city_id ( id, name )
      )
    )
`;

// 1 tiket = 1 orang x 1 leg (PP = 2 tiket per orang) 
function shapeBookingWithTickets(booking) {
  if (!booking) return booking;

  const legById = Object.fromEntries(
    (booking.flight_booking_items || []).map((item) => [
      item.id,
      {
        flight_type: item.flight_type,
        price_per_seat: item.price,
        flight_option_id: item.flight_options?.id, // pakai ini buat GET /api/flights/:id
        airline: item.flight_options?.airline,
        flight_number: item.flight_options?.flight_number,
        departure_time: item.flight_options?.departure_time,
        arrival_time: item.flight_options?.arrival_time,
        origin: item.flight_options?.origin,
        destination: item.flight_options?.destination,
      },
    ])
  );

  const tickets = (booking.flight_tickets || []).map((t) => ({
    ticket_code: t.ticket_code,
    full_name: t.full_name,
    ...legById[t.booking_item_id],
  }));

  return { ...booking, tickets };
}

// POST /api/flight-bookings
// Body: { items: [{ flight_option_id, flight_type }],
//         passenger_names: ["name1", "name2"] }
export const createFlightBooking = async (req,res) => { 
    try { 
        const {items, passenger_names} = req.body; 

        if(!Array.isArray(items)) { 
            return res.status(400).json({error: 'invalid_body', message: 'items must be an array'});
        }

        if(!Array.isArray(passenger_names) || passenger_names.length === 0) {
            return res.status(400).json({error: 'invalid_body', message: 'passenger_names must be an array with at least one name'});
        }

        const {data, error} = await req.db.rpc('create_flight_booking', { 
            p_user_id: req.user.id, 
            p_items: items,
            p_passenger_names: passenger_names,
        });

        if (error) return handleRpcError(res, error, 'createFlightBooking');

        const { data: booking, error: fetchError } = await req.db
        .from('flight_bookings')
        .select(BOOKING_FIELDS)
        .eq('id', data.id)
        .single();

        if (fetchError) throw fetchError;

        return res.status(201).json({ data: shapeBookingWithTickets(booking) });
             
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
        message: 'Booking not Found',
      });
    }
 
    return res.json({ data: shapeBookingWithTickets(data) });
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
        message: 'Failed to create payment invoice, try again later.',
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
        message: 'Booking not Found',
      });
    }
 
    if (booking.payment_status === 'paid') {
      return res.status(409).json({
        error: 'already_paid',
        message: 'Booking already paid , cannot be canceled',
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

// GET /api/flight-bookings/:id/tickets
// List ringan: cukup buat menampilkan daftar tiket dalam satu booking
export const listFlightTickets = async (req, res) => {
  try {
    const { data: booking, error } = await req.db
      .from('flight_bookings')
      .select(`
        id, booking_code, payment_status,
        flight_tickets ( id, ticket_code, full_name, flight_type, booking_item_id ),
        flight_booking_items (
          id,
          flight_options ( airline, flight_number, departure_time )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!booking) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Booking not found',
      });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(403).json({
        error: 'ticket_not_active',
        message: 'ticket is not available , please check your payment status',
      });
    }

    const legById = Object.fromEntries(
      (booking.flight_booking_items || []).map((item) => [item.id, item.flight_options])
    );

    const ticketIds = (booking.flight_tickets || []).map((t) => t.id);
    const { data: seats } = await supabase
      .from('flight_seats')
      .select('ticket_id, seat_number')
      .in('ticket_id', ticketIds.length ? ticketIds : ['00000000-0000-0000-0000-000000000000']);
    const seatByTicket = Object.fromEntries((seats || []).map((s) => [s.ticket_id, s.seat_number]));

    const tickets = (booking.flight_tickets || []).map((t) => {
      const flight = legById[t.booking_item_id];
      return {
        id: t.id,
        ticket_code: t.ticket_code,
        full_name: t.full_name,
        flight_type: t.flight_type,
        seat_number: seatByTicket[t.id] || null,
        airline: flight?.airline,
        flight_number: flight?.flight_number,
        departure_time: flight?.departure_time,
      };
    });

    return res.json({ data: { booking_code: booking.booking_code, tickets } });
  } catch (err) {
    console.error('[listFlightTickets] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/flight-bookings/:id/tickets/:ticketId

export const getFlightTicketDetail = async (req, res) => {
  try {
    const { data: booking, error } = await req.db
      .from('flight_bookings')
      .select(`
        id, booking_code, payment_status,
        flight_tickets ( id, ticket_code, full_name, flight_type, booking_item_id ),
        flight_booking_items (
          id,
          flight_options (
            airline, flight_number, departure_time, arrival_time,
            origin:origin_city_id ( name ),
            destination:destination_city_id ( name )
          )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!booking) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Booking not Found',
      });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(403).json({
        error: 'ticket_not_active',
        message: 'ticket is not available , please check the payment status',
      });
    }

    const ticket = (booking.flight_tickets || []).find((t) => t.id === req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: 'not_found',
        message: 'ticket not found in this booking',
      });
    }

    const legById = Object.fromEntries(
      (booking.flight_booking_items || []).map((item) => [item.id, item.flight_options])
    );
    const flight = legById[ticket.booking_item_id];

    const { data: seatRow } = await supabase
      .from('flight_seats')
      .select('seat_number')
      .eq('ticket_id', ticket.id)
      .maybeSingle();

    return res.json({
      data: {
        booking_code: booking.booking_code,
        ticket_code: ticket.ticket_code,
        full_name: ticket.full_name,
        flight_type: ticket.flight_type,
        seat_number: seatRow?.seat_number || null,
        airline: flight?.airline,
        flight_number: flight?.flight_number,
        departure_time: flight?.departure_time,
        arrival_time: flight?.arrival_time,
        origin: flight?.origin,
        destination: flight?.destination,
      },
    });
  } catch (err) {
    console.error('[getFlightTicketDetail] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/flight-bookings/:id/tickets/:ticketId/seat
// Body: { seat_number: "12A" }

export const claimFlightSeat = async (req, res) => {
  try {
    const { seat_number } = req.body;

    if (!seat_number || typeof seat_number !== 'string' || !seat_number.trim()) {
      return res.status(400).json({ error: 'invalid_body', message: 'seat_number must be filled' });
    }

    const { data, error } = await req.db.rpc('claim_flight_seat', {
      p_user_id: req.user.id,
      p_ticket_id: req.params.ticketId,
      p_seat_number: seat_number,
    });

    if (error) return handleRpcError(res, error, 'claimFlightSeat');

    return res.status(201).json({ data });
  } catch (err) {
    console.error('[claimFlightSeat] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};