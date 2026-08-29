import { supabase } from '../lib/supabase.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadOwnedTrip(req) {
  const { data, error } = await req.db
    .from('trips')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadCanvas(db, tripId) {
  const [tripRes, itemsRes, flightsRes] = await Promise.all([
    db.from('trips')
      .select('id, name, start_date, end_date, travelers, status, origin_city_id, cities:origin_city_id(name)')
      .eq('id', tripId).maybeSingle(),
    db.from('trip_items')
      .select(`
        id, sequence_order, status, notes, check_in, check_out, guests, added_by,
        destinations ( id, name, category, latitude, longitude, cities ( id, name ) ),
        accommodations ( id, name, tier, price_per_night, max_guests, latitude, longitude )
      `)
      .eq('trip_id', tripId).neq('status', 'removed').order('sequence_order'),
    db.from('trip_flights')
      .select(`
        id, flight_type, booked_at,
        flight_options ( id, airline, flight_number, departure_time, arrival_time, price )
      `)
      .eq('trip_id', tripId),
  ]);

  const firstError = tripRes.error || itemsRes.error || flightsRes.error;
  if (firstError) throw firstError;

  return {
    trip: tripRes.data || null,
    items: itemsRes.data || [],
    flights: flightsRes.data || [],
  };
}


// GET /api/trips/:id
export const getTripCanvas = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[getTripCanvas] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// PATCH /api/trips/:id
export const patchTrip = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

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

// POST /api/trips/:id/items
export const addTripItem = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const { destination_id, notes } = req.body;
    if (!destination_id) {
      return res.status(400).json({ error: 'invalid_body', message: 'destination_id is required' });
    }

    const { data: dest, error: destError } = await supabase
      .from('destinations')
      .select('id, name')
      .eq('id', destination_id)
      .maybeSingle();
    if (destError) throw destError;
    if (!dest) {
      return res.status(404).json({ error: 'not_found', message: 'Destination not found' });
    }

    // Sudah pernah masuk rencana: jangan buat baris baru dan jangan geser
    // urutannya. Kalau dulu dibuang, hidupkan lagi di posisi lamanya.
    const { data: existing, error: existingError } = await req.db
      .from('trip_items')
      .select('id, status, sequence_order')
      .eq('trip_id', trip.id)
      .eq('destination_id', destination_id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.status === 'booked') {
        return res.status(409).json({ error: 'already_booked', message: `${dest.name} is already booked` });
      }

      if (existing.status !== 'removed') {
        const canvas = await loadCanvas(req.db, trip.id);
        return res.json({ data: canvas, already_in_trip: true });
      }

      const { error: reviveError } = await req.db
        .from('trip_items')
        .update({ status: 'suggested', added_by: 'user', notes: notes || null })
        .eq('id', existing.id);
      if (reviveError) throw reviveError;

      const canvas = await loadCanvas(req.db, trip.id);
      return res.status(201).json({ data: canvas, revived: true });
    }

    const { data: last, error: lastError } = await req.db
      .from('trip_items')
      .select('sequence_order')
      .eq('trip_id', trip.id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    const { error: insertError } = await req.db.from('trip_items').insert({
      trip_id: trip.id,
      destination_id,
      status: 'suggested',
      added_by: 'user',
      notes: notes || null,
      sequence_order: (last?.sequence_order ?? 0) + 1,
    });
    if (insertError) throw insertError;

    const canvas = await loadCanvas(req.db, trip.id);
    return res.status(201).json({ data: canvas });
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
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const { data: item, error: itemError } = await req.db
      .from('trip_items')
      .select('id, status, check_in, check_out, accommodation_id')
      .eq('id', req.params.itemId)
      .eq('trip_id', trip.id)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) {
      return res.status(404).json({ error: 'not_found', message: 'Item does not exist in this trip' });
    }
    if (item.status === 'booked') {
      return res.status(409).json({
        error: 'already_booked',
        message: 'This item is already booked. Cancel the booking before changing it.',
      });
    }

    const { status, accommodation_id, check_in, check_out, guests, notes } = req.body;
    const patch = {};

    if (status !== undefined) {
      if (!['suggested', 'confirmed'].includes(status)) {
        return res.status(400).json({ error: 'invalid_status', message: 'status must be suggested or confirmed' });
      }
      patch.status = status;
    }

    for (const [field, value] of [['check_in', check_in], ['check_out', check_out]]) {
      if (value === undefined) continue;
      if (value !== null && !DATE_RE.test(value)) {
        return res.status(400).json({ error: 'invalid_date', message: `${field} must be in YYYY-MM-DD format` });
      }
      patch[field] = value;
    }

    // Divalidasi di sini supaya kesalahan ketahuan saat menyusun, bukan nanti
    // saat checkout ketika RPC booking yang menolaknya.
    const finalIn = patch.check_in !== undefined ? patch.check_in : item.check_in;
    const finalOut = patch.check_out !== undefined ? patch.check_out : item.check_out;
    if (finalIn && finalOut && finalOut <= finalIn) {
      return res.status(400).json({ error: 'invalid_date_range', message: 'check_out must be after check_in' });
    }

    if (accommodation_id !== undefined) {
      if (accommodation_id === null) {
        patch.accommodation_id = null;
      } else {
        const { data: acc, error: accError } = await supabase
          .from('accommodations')
          .select('id, name, max_guests')
          .eq('id', accommodation_id)
          .maybeSingle();
        if (accError) throw accError;
        if (!acc) {
          return res.status(404).json({ error: 'not_found', message: 'Accommodation not found' });
        }

        const finalGuests = guests !== undefined ? Number(guests) : null;
        if (finalGuests && finalGuests > acc.max_guests) {
          return res.status(400).json({
            error: 'exceeds_max_guests',
            message: `${acc.name} only has capacity for ${acc.max_guests} guests per room`,
          });
        }

        patch.accommodation_id = accommodation_id;
      }
    }

    if (guests !== undefined) {
      const n = Number(guests);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'invalid_guests', message: 'guests must be at least 1' });
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
      .eq('trip_id', trip.id);
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
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const { data: item, error: itemError } = await req.db
      .from('trip_items')
      .select('id, status')
      .eq('id', req.params.itemId)
      .eq('trip_id', trip.id)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) {
      return res.status(404).json({ error: 'not_found', message: 'Item does not exist in this trip' });
    }
    if (item.status === 'booked') {
      return res.status(409).json({
        error: 'already_booked',
        message: 'This item is already booked and cannot be removed from the trip.',
      });
    }

    // Ditandai removed, bukan dihapus, supaya bisa dihidupkan lagi di posisi
    // yang sama kalau pengguna berubah pikiran.
    const { error } = await req.db
      .from('trip_items')
      .update({ status: 'removed' })
      .eq('id', item.id)
      .eq('trip_id', trip.id);
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
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

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
        .eq('trip_id', trip.id)
        .select('id');
      if (error) throw error;
      updated += data?.length ?? 0;
    }

    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas, reordered: updated });
  } catch (err) {
    console.error('[reorderTripItems] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// PUT /api/trips/:id/flights
export const setTripFlight = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const { flight_option_id, flight_type } = req.body;

    if (!['outbound', 'return'].includes(flight_type)) {
      return res.status(400).json({ error: 'invalid_flight_type', message: 'flight_type must be outbound or return' });
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
    if (!flight) {
      return res.status(404).json({ error: 'not_found', message: 'Flight not found' });
    }
    if ((flight.available_seats ?? 0) < 1) {
      return res.status(409).json({ error: 'no_seats', message: 'This flight is fully booked' });
    }

    // Leg yang sudah dipesan tidak boleh ditimpa: bookingnya sungguhan dan
    // kursinya sudah terpotong.
    const { data: existing, error: existingError } = await req.db
      .from('trip_flights')
      .select('id, booked_at')
      .eq('trip_id', trip.id)
      .eq('flight_type', flight_type)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.booked_at) {
      return res.status(409).json({
        error: 'already_booked',
        message: `The ${flight_type} flight is already booked. Cancel the booking on the orders page first.`,
      });
    }

    const { error } = await req.db
      .from('trip_flights')
      .upsert(
        { trip_id: trip.id, flight_option_id, flight_type },
        { onConflict: 'trip_id,flight_type' }
      );
    if (error) throw error;

    const canvas = await loadCanvas(req.db, trip.id);
    return res.json({ data: canvas });
  } catch (err) {
    console.error('[setTripFlight] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};


// DELETE /api/trips/:id/flights/:type
export const removeTripFlight = async (req, res) => {
  try {
    const trip = await loadOwnedTrip(req);
    if (!trip) {
      return res.status(404).json({ error: 'not_found', message: 'Trip not found or does not belong to you' });
    }

    const type = req.params.type;
    if (!['outbound', 'return'].includes(type)) {
      return res.status(400).json({ error: 'invalid_flight_type', message: 'type must be outbound or return' });
    }

    const { data: existing, error: existingError } = await req.db
      .from('trip_flights')
      .select('id, booked_at')
      .eq('trip_id', trip.id)
      .eq('flight_type', type)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing) {
      return res.status(404).json({ error: 'not_found', message: `No ${type} flight in this trip yet` });
    }
    if (existing.booked_at) {
      return res.status(409).json({
        error: 'already_booked',
        message: `The ${type} flight is already booked and cannot be removed from here.`,
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