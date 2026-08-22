import { supabase } from "../lib/supabase.js";


function haversineDistance (lat1,lon1,lat2,lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180; 

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const R = 6371; // Radius of the Earth in km
    return c * R;
}



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
        cities ( id, name, provinces ( id, code, name ) )
      `)
      .eq('id', accommodationId)
      .maybeSingle();
 
    if (error) throw error;
 
    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'Akomodasi tidak ditemukan' });
    }
 
    return res.json({ data });
  } catch (err) {
    console.error('[getAccommodationById] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};