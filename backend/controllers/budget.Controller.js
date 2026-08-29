import { supabase } from "../lib/supabase.js";

const FOOD_PRICE_PER_DAY = {
  budget: 100000,
  mid: 250000,
  luxury: 500000,
};

const VALID_TIERS = ['budget', 'mid', 'luxury'];

async function getFlightPriceRange (originCityId, destinationCityId) { 
    const nowIso = new Date().toISOString();

    const { data : outboundFlights , error : outboundFlightsError } = await supabase.from('flight_options')
                                                                                    .select('id,price,airline')
                                                                                    .eq('origin_city_id',originCityId)
                                                                                    .eq('destination_city_id', destinationCityId)
                                                                                    .gt('available_seats', 0)
                                                                                    .gte('departure_time', nowIso)
                                                                                    .order('price', {ascending:true})

    if (outboundFlightsError) throw outboundFlightsError

    const {data: inboundFlights , error: inboundFlightsError} = await supabase.from('flight_options')
                                                                                    .select('id,price,airline')
                                                                                    .eq('origin_city_id',destinationCityId)
                                                                                    .eq('destination_city_id', originCityId)
                                                                                    .gt('available_seats', 0)
                                                                                    .gte('departure_time', nowIso)
                                                                                    .order('price', {ascending:true})

    if (inboundFlightsError) throw inboundFlightsError
    if( !outboundFlights || !inboundFlights || outboundFlights.length === 0 || inboundFlights.length === 0) {
        return null ; 
    }

    const CheapestIn = inboundFlights[0]; 
    const CheapestOut = outboundFlights[0]; 
    const MostExpensiveIn = inboundFlights[inboundFlights.length-1];
    const MostExpensiveOut = outboundFlights[outboundFlights.length-1];

    return { 
        CheapestIn,CheapestOut,MostExpensiveIn,MostExpensiveOut,
        total_price_cheapest :CheapestIn.price + CheapestOut.price,
        total_price_most_expensive :MostExpensiveIn.price + MostExpensiveOut.price
    }
}

async function getAccommodationPriceRange(cityId, tier) {
    const { data, error } = await supabase.from('accommodations')
        .select('id, name, tier, price_per_night, max_guests, partner_name, external_url, latitude, longitude, cover_image_url')
        .eq('city_id', cityId)
        .eq('tier', tier)
        .order('price_per_night', { ascending: true });

    if(error) throw error ; 
    if(!data || data.length===0) return null ; 

    const cheapest = data[0] ; 
    const mostExpensive = data[data.length-1] ; 

    return { 
        cheapest, mostExpensive,
        min_price : cheapest.price_per_night , 
        max_price : mostExpensive.price_per_night,
        count:data.length
    }

} 

// GET /api/destination/:id/princing?origin_city_id=1 
export const getDestinationPricing = async(req,res) => { 
    try { 
        const destinationId = req.params.id; 
        const {origin_city_id} = req.query ; 
        if(!origin_city_id) { 
            return res.status(400)
            .json({error:'invalid_origin_city_id',
                   message:"Origin city id is required"
                })
        }

        const {data:destination,error:destError} = await supabase.from('destinations')
                                                                .select('id,city_id,name')
                                                                .eq('id',destinationId)
                                                                .maybeSingle(); 
        if (destError) throw destError; 
        if(!destination) { 
            return res.status(404).json({error:'not_found',message:'Destination not found'})
        }

        const flight = await getFlightPriceRange(Number(origin_city_id),destination.city_id)

        if(!flight) { 
            return res.status(404).json({
                error: 'flight_not_found',
                message: 'Flight Data is not available for this route'
            })
        }

        const tierResults = await Promise.all(
            VALID_TIERS.map(async(tier) => { 
                const accommodation = await getAccommodationPriceRange(destination.city_id, tier); 
                return {
                    tier, 
                    accommodation: accommodation
                        ? {
                            price_per_night_min: accommodation.cheapest.price_per_night,
                            price_per_night_max: accommodation.mostExpensive.price_per_night,
                            options_available: accommodation.count,
                        }
                        : null,  // tidak ada akomodasi tier ini di kota tersebut
                    food_price_per_day: FOOD_PRICE_PER_DAY[tier]
                };
            })
        )

        return res.json({
            destination: { id: destination.id, name: destination.name },
            flight: {
                price_min: flight.total_price_cheapest,
                price_max: flight.total_price_most_expensive,
                cheapest_airline: flight.CheapestOut.airline,
                note: 'Harga pulang-pergi per orang',
            },
            tiers: tierResults,
        });
    }catch(err) { 
        console.error('[getDestinationPricing] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}

// POST /api/budget/estimate 
// Body: { destination_id, origin_city_id, tier, duration_days, travelers }
export const estimateBudget = async (req,res) => { 
    try {
        const { destination_id, origin_city_id, tier, duration_days, travelers } = req.body;
    
        if (!destination_id || !origin_city_id || !tier) {
        return res.status(400).json({
            error: 'invalid_body',
            message: 'destination_id, origin_city_id, and tier must be filled',
        });
        }
    
        if (!VALID_TIERS.includes(tier)) {
        return res.status(400).json({
            error: 'invalid_tier',
            message: 'tier must be in [budget, mid, luxury]',
        });
        }
    
        const durationDays = parseInt(duration_days);
        const travelersCount = parseInt(travelers);
    
        if (!Number.isInteger(durationDays) || durationDays < 1) {
            return res.status(400).json({ error: 'invalid_duration', message: 'duration_days minimum 1 day' });
        }
    
        if (!Number.isInteger(travelersCount) || travelersCount < 1) {
            return res.status(400).json({ error: 'invalid_travelers', message: 'travelers minimum 1 person' });
        }

        const { data : destination , error : destError} = await supabase.from('destinations')
                                                                         .select('id,name,city_id')
                                                                         .eq('id', destination_id)
                                                                         .maybeSingle(); 
        if (destError) throw destError ;
        if(!destination){ 
            return res.status(404).json({error:'not_found',message:'Destination not found'
            })
        }       
        
        const flight = await getFlightPriceRange(Number(origin_city_id),destination.city_id)

        if(!flight) {
            return res.status(404).json({
                error: 'flight_not_found',
                message: 'Flight Data is not available for this route'
            })
        }

        const accommodation = await getAccommodationPriceRange(destination.city_id, tier); 
        if(!accommodation) { 
            return res.status(404).json({
                error: 'accommodation_not_found',
                message: `Accommodation Data is not available for tier ${tier}`
            })
        }

        const nights = Math.max(durationDays - 1, 0);
        const foodPricePerDay = FOOD_PRICE_PER_DAY[tier];
        const roomsNeeded = Math.ceil(travelersCount / accommodation.cheapest.max_guests);
    
        const flightTotalMin = flight.price_min * travelersCount;
        const flightTotalMax = flight.price_max * travelersCount;
    
        const accommodationTotalMin = accommodation.min_price * nights * roomsNeeded;
        const accommodationTotalMax = accommodation.max_price * nights * roomsNeeded;
    
        const foodTotal = foodPricePerDay * durationDays * travelersCount;
    
        const totalEstimateMin = flightTotalMin + accommodationTotalMin + foodTotal;
        const totalEstimateMax = flightTotalMax + accommodationTotalMax + foodTotal;
        let savedEstimate = null ; 

        if (req.user) { 
            const { data , error:insertError }  = await req.db.from('budget_estimates')
                                                                .insert({
                                                                    user_id : req.user.id,
                                                                    destination_id,
                                                                    origin_city_id: Number(origin_city_id),
                                                                    tier,
                                                                    duration_days: durationDays,
                                                                    travelers: travelersCount,
                                                                    total_estimate: totalEstimateMin
                                                                })
                                                                .select()
                                                                .single();  
            if (insertError) throw insertError;
            savedEstimate = data ;                                                        
        }
        return res.json({
            destination: { id: destination.id, name: destination.name },
            tier,
            duration_days: durationDays,
            travelers: travelersCount,
            breakdown: {
                flight: {
                price_min: flightTotalMin,
                price_max: flightTotalMax,
                note: `Untuk ${travelersCount} orang, pulang-pergi`,
                },
                accommodation: {
                price_per_night_min: accommodation.min_price,
                price_per_night_max: accommodation.max_price,
                nights,
                rooms_needed: roomsNeeded,
                total_min: accommodationTotalMin,
                total_max: accommodationTotalMax,
                },
                food: {
                price_per_day: foodPricePerDay,
                total: foodTotal,
                },
            },
            total_estimate_min: totalEstimateMin,
            total_estimate_max: totalEstimateMax,
            estimate_id: savedEstimate?.id || null,
        });
    } catch (err) {
        console.error('[estimateBudget] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
 
 
// GET /api/budget/history
export const getBudgetHistory = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('budget_estimates')
      .select(`
        id, tier, duration_days, travelers, total_estimate, created_at,
        destinations ( id, name, cover_image_url )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
 
    if (error) throw error;
 
    return res.json({ data });
  } catch (err) {
    console.error('[getBudgetHistory] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};