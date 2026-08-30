import { supabase } from '../lib/supabase.js';
import {
  DATE_RE,loadCanvas,loadOwnedStop,
  loadOwnedItem,getDestinationCity,
  resolveOrCreateStop,createStop,nextItemSequence,
} from '../lib/tripStops.helper.js';
 import { handleRpcError } from '../lib/bookingPayment.js';

async function loadOwnedTrip(req) {
  const { data, error } = await req.db
    .from('trips')
    .select('id, status, start_date, end_date')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
 
  if (error) throw error;
  return data;
}
 
const notFound = (res, message) => res.status(404).json({ error: 'not_found', message });
const tripNotFound = (res) => notFound(res, 'Trip not found or does not belong to you');
 

// GET /api/trips 
export const getTrips = async (req, res) => {
  try{
    const {data:trips , error:tripsError} = await req.db
      .from('trips')
      .select('id, name, start_date, end_date, travelers, origin_city_id, cities:origin_city_id(name)')      
      .eq('user_id', req.user.id)
      .order('start_date', { ascending: false });
    if (tripsError) throw tripsError;
    return res.json({ data: trips });
  }catch (err) {
    console.error('[getTrips] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// GET /api/trips/:id
export const getTripCanvas = async (req, res) => {
  try{ 
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return tripNotFound(res);
    }
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });

  }catch (err) { 
    console.error('[getTripCanvas] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
// PATCH /api/trips/:id
export const patchTrip = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);

    const { name, start_date, end_date, travelers, origin_city_id } = req.body;
    const patch = {};

    if (name !== undefined) patch.name = String(name).slice(0, 120);

    for (const [field, value] of [['start_date', start_date], ['end_date', end_date]]) {
      if (value === undefined) continue;
      if (value !== null && !DATE_RE.test(value)) {
        return res.status(400).json({ error: 'invalid_date', message: `${field} must be in YYYY-MM-DD format` });
      }
      patch[field] = value;
    }

    const finalStart = patch.start_date !== undefined ? patch.start_date : trip.start_date;
    const finalEnd = patch.end_date !== undefined ? patch.end_date : trip.end_date;
    if (finalStart && finalEnd && finalEnd < finalStart) {
      return res.status(400).json({ error: 'invalid_date_range', message: 'end_date cannot be before start_date' });
    }

    if (travelers !== undefined) {
      const n = Number(travelers);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'invalid_travelers', message: 'travelers must be at least 1' });
      }
      patch.travelers = n;
    }

    if (origin_city_id !== undefined) {
      patch.origin_city_id = origin_city_id === null ? null : Number(origin_city_id);
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update', message: 'No fields were changed' });
    }

    const { error } = await req.db.from('trips').update(patch).eq('id', trip.id);
    if (error) throw error;

    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[patchTrip] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/trips/:id/stops
export const addTripStop = async ( req,res) => { 
  try{
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return tripNotFound(res);
    }
    const {city_id, check_in, check_out , force_new} = req.body ; 
    if (!city_id) {
      return res.status(400).json({ error: 'invalid_body', message: 'city_id is required' });
    }

    const { data: city, error: cityError } = await supabase.from('cities')
                                                              .select('id,name')
                                                              .eq('id',Number(city_id))
                                                              .maybeSingle();
    if (cityError) throw cityError;
    if(!city) return notFound(res,'City not found');

    for (const [field, value] of [['check_in', check_in], ['check_out', check_out]]) {
      if (value === undefined || value === null) continue;
      if (!DATE_RE.test(value)) {
        return res.status(400).json({ error: 'invalid_date', message: `${field} must be in YYYY-MM-DD format` });
      }
    }
    if (check_in && check_out && check_out <= check_in) {
      return res.status(400).json({ error: 'invalid_date_range', message: 'check_out must be after check_in' });
    }
    
    const dates = {};
    if (check_in) dates.check_in = check_in;
    if (check_out) dates.check_out = check_out;

    // force_new dipakai kalau trip memang singgah ke kota yang sama dua kali
    if (force_new) {
      const stop = await createStop(req.db, trip.id, city.id, dates);
      const canvas = await loadCanvas(req.db, trip.id);
      return res.status(201).json({ data: canvas, stop_id: stop.id });
    }
    
    const { stop, created } = await resolveOrCreateStop(req.db, trip.id, city.id);
    
    if (!created && Object.keys(dates).length > 0) {
      const { error } = await req.db.from('trip_stops').update(dates).eq('id', stop.id);
      if (error) throw error;
    }

    const canvas = await loadCanvas(req.db, trip.id);
    return res.status(created ? 201 : 200).json({
      data: canvas,
      stop_id: stop.id,
      already_in_trip: !created,
    });
  }catch (err) {
    console.error('[addTripStop] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// PATCH /api/trips/:id/stops/:stopId
export const patchTripStop = async (req, res) => {
  try  { 
    const trip = await loadOwnedTrip(req);
    if(!trip) return tripNotFound(res);

    const stop = await loadOwnedStop(req.db,trip.id,req.params.stopId); 
    if (!stop) return notFound(res, 'Stop does not exist in this trip');

    const { data: bookedItems, error: bookedError } = await req.db
      .from('trip_items')
      .select('id')
      .eq('trip_stop_id', stop.id)
      .eq('status', 'booked')
      .limit(1);
    if (bookedError) throw bookedError;

    const { accommodation_id, check_in, check_out } = req.body;
    const touchesBooking = accommodation_id !== undefined || check_in !== undefined || check_out !== undefined;
 
    if (stop.accommodation_status === 'booked' && touchesBooking) {
      return res.status(409).json({
        error: 'already_booked',
        message: 'This stop\u2019s accommodation is already booked. Cancel the booking before changing dates or accommodation.',
      });
    }
    const patch = {};

    for (const [field, value] of [['check_in', check_in], ['check_out', check_out]]) {
      if (value === undefined) continue;
      if (value !== null && !DATE_RE.test(value)) {
        return res.status(400).json({ error: 'invalid_date', message: `${field} must be in YYYY-MM-DD format` });
      }
      patch[field] = value;
    }

    const finalIn = patch.check_in !== undefined ? patch.check_in : stop.check_in;
    const finalOut = patch.check_out !== undefined ? patch.check_out : stop.check_out;
    if (finalIn && finalOut && finalOut <= finalIn) {
      return res.status(400).json({ error: 'invalid_date_range', message: 'check_out must be after check_in' });
    }

    if (accommodation_id !== undefined) {
      if (accommodation_id === null) {
        patch.accommodation_id = null;
      } else {
        const { data: acc, error: accError } = await supabase
          .from('accommodations')
          .select('id, name, max_guests, city_id')
          .eq('id', accommodation_id)
          .maybeSingle();
        if (accError) throw accError;
        if (!acc) return notFound(res, 'Accommodation not found');
 
        // Penginapan harus berada di kota stop ini. Tanpa cek ini, hotel di
        // Bali bisa nyantol ke stop Yogyakarta tanpa ada yang protes sampai
        // checkout.
        if (acc.city_id !== stop.city_id) {
          return res.status(400).json({
            error: 'accommodation_city_mismatch',
            message: `${acc.name} is not in the city of this stop`,
          });
        }
 
        patch.accommodation_id = accommodation_id;
      }
    }

    if (patch.accommodation_id !== undefined) {
      patch.accommodation_status = patch.accommodation_id === null ? 'none' : 'pending';
      patch.accommodation_booking_id = null;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update', message: 'No fields were changed' });
    }

    const { error } = await req.db
      .from('trip_stops')
      .update(patch)
      .eq('id', stop.id)
      .eq('trip_id', trip.id);
    if (error) throw error;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });

  }catch(err) {
    console.error('[patchTripStop] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// DELETE /api/trips/:id/stops/:stopId
export const removeTripStop = async (req,res) => { 
  try{ 
    const trip = await loadOwnedTrip(req);
    if(!trip) return tripNotFound(res);

    const stop = await loadOwnedStop(req.db,trip.id,req.params.stopId); 
    if (!stop) return notFound(res, 'Stop does not exist in this trip');

    if (stop.accommodation_status === 'booked') {
      return res.status(409).json({
        error: 'already_booked',
        message: 'This stop\u2019s accommodation is already booked and cannot be removed. Cancel the booking first.',
      });
    }
    // trip items delete on cascade jadi aman jika stop dihapus.
    const { error } = await req.db
      .from('trip_stops')
      .delete()
      .eq('id', stop.id)
      .eq('trip_id', trip.id);
    if (error) throw error;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[removeTripStop] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
 

// PUT /api/trips/:id/stops/order
export const reorderTripStops = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);
 
    const { ordered_stop_ids } = req.body;
    if (!Array.isArray(ordered_stop_ids) || ordered_stop_ids.length === 0) {
      return res.status(400).json({ error: 'invalid_body', message: 'ordered_stop_ids must contain at least one id' });
    }
 
    let updated = 0;
    for (let i = 0; i < ordered_stop_ids.length; i++) {
      const { data, error } = await req.db
        .from('trip_stops')
        .update({ sequence_order: i + 1 })
        .eq('id', ordered_stop_ids[i])
        .eq('trip_id', trip.id)
        .select('id');
      if (error) throw error;
      updated += data?.length ?? 0;
    }
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas, reordered: updated });
  } catch (err) {
    console.error('[reorderTripStops] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// Body: { destination_id, notes, stop_id? }
// stop_id opsional -- kalau tidak dikirim, stop ditentukan dari kota destinasi dan dibuat otomatis kalau kota itu belum disinggahi.
export const addTripItem = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return tripNotFound(res);
    }

    const { destination_id, notes, stop_id } = req.body;
    if (!destination_id) {
      return res.status(400).json({ error: 'invalid_body', message: 'destination_id is required' });
    }

    const dest = await getDestinationCity(destination_id);
      if (!dest) return notFound(res, 'Destination not found');
 
    let stop;
    if (stop_id) {
      stop = await loadOwnedStop(req.db, trip.id, stop_id);
      if (!stop) return notFound(res, 'Stop does not exist in this trip');
 
      if (stop.city_id !== dest.city_id) {
        return res.status(400).json({
          error: 'destination_city_mismatch',
          message: `${dest.name} is not in the city of the selected stop`,
        });
      }
    } else {
      ({ stop } = await resolveOrCreateStop(req.db, trip.id, dest.city_id));
    }

    // Sudah pernah masuk rencana: jangan buat baris baru dan jangan geser
    // urutannya. Kalau dulu dibuang, hidupkan lagi di posisi lamanya.
    const { data: existing, error: existingError } = await req.db
      .from('trip_items')
      .select('id, status, sequence_order')
      .eq('trip_stop_id', stop.id)
      .eq('destination_id', destination_id)
      .maybeSingle();
        if (existingError) throw existingError;
 
    if (existing) { 
      if (existing.status !== 'removed') {
        const canvas = await loadCanvas(req.db, trip.id);
        return res.json({ data: canvas, already_in_trip: true, stop_id: stop.id });
      }
 
      const { error: reviveError } = await req.db
        .from('trip_items')
        .update({ status: 'suggested', added_by: 'user', notes: notes || null })
        .eq('id', existing.id);
      if (reviveError) throw reviveError;
 
      const canvas = await loadCanvas(req.db, trip.id);
      return res.status(201).json({ data: canvas, revived: true, stop_id: stop.id });
    }
 
    const order = await nextItemSequence(req.db, stop.id);
 
    const { error: insertError } = await req.db.from('trip_items').insert({
      trip_stop_id: stop.id,
      destination_id,
      status: 'suggested',
      added_by: 'user',
      notes: notes || null,
      sequence_order: order,
    });
    if (insertError) throw insertError;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.status(201).json({ data: canvas, stop_id: stop.id });
  } catch (err) {
    console.error('[addTripItem] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// PATCH /api/trips/:id/items/:itemId
export const patchTripItem = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return tripNotFound(res);
    }
    const item  = await loadOwnedItem(req.db, trip.id, req.params.itemId);
    if(!item) return notFound(res, 'Item does not exist in this trip');

    const { status, accommodation_id, check_in, check_out, guests, notes } = req.body;

    if (accommodation_id !== undefined || check_in !== undefined || check_out !== undefined) {
      return res.status(400).json({
        error: 'moved_to_stop',
        message: 'accommodation_id, check_in and check_out now belong to the stop. Use PATCH /api/trips/:id/stops/:stopId instead.',
        stop_id: item.trip_stop_id,
      });
    }

    const patch = {};
 
    if (status !== undefined) {
      if (!['suggested', 'confirmed'].includes(status)) {
        return res.status(400).json({ error: 'invalid_status', message: 'status must be suggested or confirmed' });
      }
      patch.status = status;
    }

    if (guests !== undefined) {
      const n = Number(guests);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'invalid_guests', message: 'guests must be at least 1' });
      }

    const accId = item.trip_stops?.accommodation_id;
    if (accId) {
        const { data: acc, error: accError } = await supabase
          .from('accommodations')
          .select('id, name, max_guests')
          .eq('id', accId)
          .maybeSingle();
        if (accError) throw accError;
 
        if (acc && n > acc.max_guests) {
          return res.status(400).json({
            error: 'exceeds_max_guests',
            message: `${acc.name} only has capacity for ${acc.max_guests} guests per room`,
          });
        }
      }
        patch.guests = n;
    }

    if (notes !== undefined) patch.notes = notes ? String(notes).slice(0, 500) : null;
 
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update', message: 'No fields were changed' });
    }
 
    const { error } = await req.db
      .from('trip_items')
      .update(patch)
      .eq('id', item.id)
      .eq('trip_stop_id', item.trip_stop_id);
    if (error) throw error;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[patchTripItem] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// DELETE /api/trips/:id/items/:itemId
export const removeTripItem = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return tripNotFound(res);
    }

    const item = await loadOwnedItem(req.db, trip.id, req.params.itemId);
    if(!item) return notFound(res, 'Item does not exist in this trip');
    const { error } = await req.db
      .from('trip_items')
      .update({ status: 'removed' })
      .eq('id', item.id)
      .eq('trip_stop_id', item.trip_stop_id);
    if (error) throw error;

    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });

  } catch (err) {
    console.error('[removeTripItem] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// PUT /api/trips/:id/items/order
export const reorderTripItems = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);
 
    const stop = await loadOwnedStop(req.db, trip.id, req.params.stopId);
    if (!stop) return notFound(res, 'Stop does not exist in this trip');
 
    const { ordered_item_ids } = req.body;
    if (!Array.isArray(ordered_item_ids) || ordered_item_ids.length === 0) {
      return res.status(400).json({ error: 'invalid_body', message: 'ordered_item_ids must contain at least one id' });
    }
 
    let updated = 0;
    for (let i = 0; i < ordered_item_ids.length; i++) {
      const { data, error } = await req.db
        .from('trip_items')
        .update({ sequence_order: i + 1 })
        .eq('id', ordered_item_ids[i])
        .eq('trip_stop_id', stop.id)
        .select('id');
      if (error) throw error;
      updated += data?.length ?? 0;
    }
 
    const canvas = await loadCanvas(req.db, trip.id);
 
    // Id yang tidak cocok dilaporkan apa adanya: biasanya itu item dari stop
    // lain yang ikut terkirim karena frontend menganggap listnya masih global.
    if (updated !== ordered_item_ids.length) {
      return res.json({
        data: canvas,
        reordered: updated,
        warning: `${ordered_item_ids.length - updated} item(s) do not belong to this stop and were not reordered`,
      });
    }
 
    return res.json({ data: canvas, reordered: updated });
  } catch (err) {
    console.error('[reorderTripItems] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};



// PUT /api/trips/:id/stops/:stopId/flights
export const setTripFlight = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);
 
    const stop = await loadOwnedStop(req.db, trip.id, req.params.stopId);
    if (!stop) return notFound(res, 'Stop does not exist in this trip');
 
    const { flight_option_id, flight_role } = req.body;
 
    if (!['arrival', 'departure'].includes(flight_role)) {
      return res.status(400).json({ error: 'invalid_flight_role', message: 'flight_role must be arrival or departure' });
    }
    if (!flight_option_id) {
      return res.status(400).json({ error: 'invalid_body', message: 'flight_option_id is required' });
    }
 
    const { data: flight, error: flightError } = await supabase
      .from('flight_options')
      .select('id, available_seats')
      .eq('id', flight_option_id)
      .maybeSingle();
    if (flightError) throw flightError;
    if (!flight) return notFound(res, 'Flight not found');
 
    if ((flight.available_seats ?? 0) < 1) {
      return res.status(409).json({ error: 'no_seats', message: 'This flight is fully booked' });
    }
 
    // Leg yang sudah dipesan tidak boleh ditimpa: bookingnya sungguhan dan
    // kursinya sudah terpotong.
    const { data: existing, error: existingError } = await req.db
      .from('trip_flights')
      .select('id, booked_at')
      .eq('trip_stop_id', stop.id)
      .eq('flight_role', flight_role)
      .maybeSingle();
    if (existingError) throw existingError;
 
    if (existing?.booked_at) {
      return res.status(409).json({
        error: 'already_booked',
        message: `The ${flight_role} flight for this stop is already booked. Cancel the booking on the orders page first.`,
      });
    }
 
    const { error } = await req.db
      .from('trip_flights')
      .upsert(
        { trip_id: trip.id, trip_stop_id: stop.id, flight_option_id, flight_role, confirmed: true },
        { onConflict: 'trip_stop_id,flight_role' }
      );
    if (error) throw error;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[setTripFlight] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
 
 
// DELETE /api/trips/:id/stops/:stopId/flights/:role
export const removeTripFlight = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);
 
    const stop = await loadOwnedStop(req.db, trip.id, req.params.stopId);
    if (!stop) return notFound(res, 'Stop does not exist in this trip');
 
    const role = req.params.role;
    if (!['arrival', 'departure'].includes(role)) {
      return res.status(400).json({ error: 'invalid_flight_role', message: 'role must be arrival or departure' });
    }
 
    const { data: existing, error: existingError } = await req.db
      .from('trip_flights')
      .select('id, booked_at')
      .eq('trip_stop_id', stop.id)
      .eq('flight_role', role)
      .maybeSingle();
    if (existingError) throw existingError;
 
    if (!existing) return notFound(res, `No ${role} flight for this stop yet`);
 
    if (existing.booked_at) {
      return res.status(409).json({
        error: 'already_booked',
        message: `The ${role} flight for this stop is already booked and cannot be removed from here.`,
      });
    }
 
    const { error } = await req.db.from('trip_flights').delete().eq('id', existing.id);
    if (error) throw error;
 
    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[removeTripFlight] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// POST /api/trips/:id/checkout
// body : { passenger_names }
export const checkoutTrip = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) return tripNotFound(res);
 
    const { passenger_names } = req.body || {};

 
    const { data, error } = await req.db.rpc('create_trip_booking', {
      p_user_id: req.user.id,
      p_trip_id: trip.id,
      p_passenger_names: Array.isArray(passenger_names) && passenger_names.length
        ? passenger_names
        : null,
    });
 
    if (error) return handleRpcError(res, error, 'checkoutTrip');
 
    const { error: tripStatusError } = await req.db
      .from('trips')
      .update({ status: 'booked' })
      .eq('id', trip.id);
    if (tripStatusError) console.error('[checkoutTrip] gagal memperbarui status trip', tripStatusError);
 
    return res.status(201).json({ data });
  } catch (err) {
    console.error('[checkoutTrip] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
 