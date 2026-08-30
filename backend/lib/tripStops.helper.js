import {supabase} from './supabase.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;


export async function getDestinationCity(destinationId) { 
        const { data, error } = await supabase
            .from('destinations')
            .select('id,name,city_id,cities ( id, name )')
            .eq('id', destinationId)
            .maybeSingle();
    
        if (error) throw error;
    
        return data
}


export async function resolveOrCreateStop(db,tripId,cityId) { 
    const { data: existing, error: findError} = await db.from('trip_stops')  
                                                        .select('id, city_id, sequence_order')
                                                        .eq('trip_id',tripId)
                                                        .eq('city_id',cityId)
                                                        .order('sequence_order', { ascending: true })
                                                        .limit(1)
                                                        .maybeSingle(); 

    if(findError) throw findError;
    if(existing) return { stop:existing , created:false}

    const stop = await createStop(db,tripId,cityId);
    return { stop, created:true}
  }


export async function createStop(db, tripId, cityId, extra = {}) {
  const { data: last, error: lastError } = await db
    .from('trip_stops')
    .select('sequence_order')
    .eq('trip_id', tripId)
    .order('sequence_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
 
  const { data, error } = await db
    .from('trip_stops')
    .insert({
      trip_id: tripId,
      city_id: cityId,
      sequence_order: (last?.sequence_order ?? 0) + 1,
      ...extra,
    })
    .select('id, city_id, sequence_order, check_in, check_out, accommodation_id')
    .single();
  if (error) throw error;
 
  return data;
}


export async function nextItemSequence(db, stopId) {
  const { data, error } = await db
    .from('trip_items')
    .select('sequence_order')
    .eq('trip_stop_id', stopId)
    .order('sequence_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
 
  return (data?.sequence_order ?? 0) + 1;
}


export async function loadOwnedStop(db, tripId, stopId) {
  const { data, error } = await db
    .from('trip_stops')
    .select(`
      id, trip_id, city_id, check_in, check_out, sequence_order,
      accommodation_id, accommodation_status, accommodation_booking_id
    `)
    .eq('id', stopId)
    .eq('trip_id', tripId)
    .maybeSingle();
  if (error) throw error;
  return data;
}


export async function loadOwnedItem(db, tripId, itemId) {
  const { data, error } = await db
    .from('trip_items')
    .select(`
      id, status, sequence_order, notes, guests, destination_id,
      trip_stop_id,
      destinations ( id, name ),
      trip_stops!inner ( id, trip_id, city_id, check_in, check_out, accommodation_id, accommodation_status )
    `)
    .eq('id', itemId)
    .eq('trip_stops.trip_id', tripId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadCanvas(db, tripId) {
  const [tripRes, stopsRes] = await Promise.all([
    db.from('trips')
      .select('id, name, start_date, end_date, travelers, status, origin_city_id, cities:origin_city_id(name)')
      .eq('id', tripId).maybeSingle(),
 
    db.from('trip_stops')
      .select(`
        id, sequence_order, check_in, check_out,
        accommodation_status, accommodation_booking_id,
        cities ( id, name, province_id, provinces ( id, name ) ),
        accommodations ( id, name, tier, price_per_night, max_guests, latitude, longitude ),
        trip_items (
          id, sequence_order, status, notes, guests, added_by,
          destinations ( id, name, category, latitude, longitude, cover_image_url )
        ),
        trip_flights (
          id, flight_role, booked_at, confirmed,
          flight_options ( id, airline, flight_number, departure_time, arrival_time, price )
        )
      `)
      .eq('trip_id', tripId)
      .order('sequence_order', { ascending: true }),
  ]);
 
  const firstError = tripRes.error || stopsRes.error;
  if (firstError) throw firstError;
 
  // Item berstatus 'removed' disaring di sini, bukan lewat query: PostgREST
  // tidak bisa memfilter tabel anak tanpa ikut membuang stop induknya yang
  // seluruh itemnya kebetulan removed -- stop kosong tetap harus tampil.
  const stops = (stopsRes.data || []).map((stop) => ({
    ...stop,
    trip_items: (stop.trip_items || [])
      .filter((it) => it.status !== 'removed')
      .sort((a, b) => a.sequence_order - b.sequence_order),
  }));
 
  return {
    trip: tripRes.data || null,
    stops,
  };
}