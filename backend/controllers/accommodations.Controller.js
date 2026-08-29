import { supabase } from "../lib/supabase.js";

const PAGE_SIZE=20; 
function haversineDistance (lat1,lon1,lat2,lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180; 

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const R = 6371; // Radius of the Earth in km
    return c * R;
}

export const getAccommodations = async (req, res) => {
    try {
        const { city_id, province_id, tier, q, min_rating, page } = req.query;
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = currentPage * PAGE_SIZE - 1;

        if (tier && !['budget', 'mid', 'luxury'].includes(tier)) {
            return res.status(400).json({
                error: 'invalid_tier',
                message: 'tier must be budget, mid, or luxury',
            });
        }

        let minRatingNum = null;
        if (min_rating !== undefined) {
            minRatingNum = Number(min_rating);
            if (Number.isNaN(minRatingNum) || minRatingNum < 0 || minRatingNum > 5) {
                return res.status(400).json({
                    error: 'invalid_min_rating',
                    message: 'min_rating must be a number between 0 and 5',
                });
            }
        }

        let query = supabase
            .from('accommodations')
            .select(`
                id, name, tier, price_per_night, max_guests, partner_name,
                external_url, latitude, longitude, cover_image_url,
                avg_rating, review_count,
                cities ( id, name, provinces ( id, code, name ) )
            `, { count: 'exact' });

        if (city_id) query = query.eq('city_id', Number(city_id));
        if (tier) query = query.eq('tier', tier);
        if (q) query = query.ilike('name', `%${q}%`);
        if (minRatingNum !== null) query = query.gte('avg_rating', minRatingNum);
        if (province_id) query = query.eq('cities.province_id', Number(province_id));

        query = query.order('avg_rating', { ascending: false }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Akomodasi tidak ditemukan' });
        }

        return res.json({
            data,
            page: currentPage,
            total: count ?? data.length,
            total_pages: Math.ceil((count ?? data.length) / PAGE_SIZE),
        });
    } catch (err) {
        console.error('[getAccommodations] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};

// GET /api/destinations/:id/accommodations?tier=
export const getDestinationAccommodations = async (req,res) => { 
    try { 
        const destinationId = req.params.id ; 
        const {tier} = req.query ; 

    if (tier && !['budget', 'mid', 'luxury'].includes(tier)) {
        return res.status(400).json({
            error: 'invalid_tier',
            message: 'tier must be budget, mid, or luxury',
        });
    }
    const {data :destination, error: destError} = await supabase.from('destinations')
                                                                .select('id,name,city_id,latitude,longitude')
                                                                .eq('id', destinationId)
                                                                .maybeSingle();

    if (destError) throw destError ;
    if (!destination) { 
        return res.status(404).json({
            error: 'not_found',
            message: 'Destination not found',
        });
    }

    let query = supabase.from('accommodations')
                        .select('id, name, tier, price_per_night, max_guests, partner_name, external_url, latitude, longitude, cover_image_url')
                        .eq('city_id', destination.city_id)
    
    if(tier) { 
        query = query.eq('tier',tier) ; 
    }

    const {data : accommodations, error : accomError} = await query ; 
    if(accomError) throw accomError ;
    if(!accommodations || accommodations.length === 0) { 
        return res.json({
            destination: { id: destination.id, name: destination.name },
            data: [], // kosong, tapi tetap 200
        });   
    }
    
    const withDistance = accommodations.map((acc)=> ({
        ...acc,
        distance_km:( acc.latitude != null && acc.longitude !=null) ? Math.round(haversineDistance(destination.latitude,destination.longitude,acc.latitude,acc.longitude) * 10 ) / 10 : null,
    })); 

    withDistance.sort((a,b) => { 
        if(a.distance_km === null) return 1 ; 
        if(b.distance_km === null) return -1 ; 
        return a.distance_km - b.distance_km ; 
    })

    return res.json({
        destination: {id: destination.id, name :destination.name},
        data: withDistance, 
        })
    } catch (err) { 
        console.error('[getDestinationAccommodations] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}


export const getAccommodationById = async (req, res) => {
  try {
    const accommodationId = req.params.id;
 
    const { data, error } = await supabase
      .from('accommodations')
      .select(`
        id, name, tier, price_per_night, max_guests,
        partner_name, external_url, latitude, longitude, cover_image_url,
        avg_rating, review_count,
        cities ( id, name, provinces ( id, code, name ) )
      `)
      .eq('id', accommodationId)
      .maybeSingle();
 
    if (error) throw error;
 
    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'Accomodation not found' });
    }
 
    return res.json({ data });
  } catch (err) {
    console.error('[getAccommodationById] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/accommodations/:id/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
// Preview ketersediaan kamar 
export const getAccommodationAvailability = async (req, res) => {
    try {
        const accommodationId = req.params.id;
        const { check_in, check_out } = req.query;

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!check_in || !check_out || !datePattern.test(check_in) || !datePattern.test(check_out)) {
            return res.status(400).json({
                error: 'invalid_query',
                message: 'check_in and check_out must be in YYYY-MM-DD format',
            });
        }

        const { data, error } = await supabase.rpc('get_accommodation_availability', {
            p_accommodation_id: accommodationId,
            p_check_in: check_in,
            p_check_out: check_out,
        });

        if (error) {
            if (error.message?.includes('ACCOMMODATION_NOT_FOUND')) {
                return res.status(404).json({ error: 'not_found', message: 'Accomodation not found ' });
            }
            if (error.message?.includes('INVALID_DATES')) {
                return res.status(400).json({ error: 'invalid_dates', message: 'check_out must be greater than check_in' });
            }
            throw error;
        }

        return res.json({ data });
    } catch (err) {
        console.error('[getAccommodationAvailability] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};