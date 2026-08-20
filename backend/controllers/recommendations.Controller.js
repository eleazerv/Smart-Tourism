import { supabase } from '../lib/supabase.js';

function shapeSeasonInfo(row) {
  return {
    province: row.provinces,
    season: row.season,
    recommended_activities: row.recommended_activities,
  };
}


export const getRecommendations = async (req, res) => {
    try {
        const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
        const { province_id } = req.query;

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return res.status(400).json({ 
                error: 'invalid_month', 
                message: 'month must be integer between 1 and 12' 
            });
        }
        let climateQuery = supabase.from('climate_patterns')
                                        .select(`id,season,recommended_activities,
                                                provinces(id,code,name),
                                                climate_pattern_tags(tags(id,slug))`)
                                        .contains('months',[month])
        if (province_id) { 
            climateQuery = climateQuery.eq('province_id', province_id)
        }

        const { data : climateRows , error: climateError} = await climateQuery;
        if (climateError) throw climateError;
        if (!climateRows || climateRows.length === 0) {
            return res.json({
                month,
                province_id: province_id ? Number(province_id) : null,
                season_info: [],
                destinations: [],
            });
        }

        const tagIdSet = new Set(); 
        for (const row of climateRows) { 
            for (const link of row.climate_pattern_tags) { 
                tagIdSet.add(link.tags.id);
            }
        }
        const tagIds = [...tagIdSet] 
        
        if (tagIds.length === 0) {
        return res.json({
            month,
            province_id: province_id ? Number(province_id) : null,
            season_info: climateRows.map(shapeSeasonInfo),
            destinations: [],
        })
        }

        const {data : destTagRows , error: destTagError} = await supabase
                                                            .from('destination_tags')
                                                            .select('destination_id')
                                                            .in('tag_id',tagIds)
        if(destTagError) throw destTagError 
        const destinationIds = [...new Set(destTagRows.map(r=> r.destination_id))]
        if (destinationIds.length === 0) {
            return res.json({
                month,
                province_id: province_id ? Number(province_id) : null,
                season_info: climateRows.map(shapeSeasonInfo),
                destinations: [],
            });
        }

         let destQuery = supabase.from('destinations')
                                .select(`
                                    id, name, description, category, cover_image_url,
                                    avg_rating, view_count,
                                    provinces ( id, code, name ),
                                    cities ( id, name )
                                `)
                                .in('id', destinationIds)
                                .order('view_count', { ascending: false })
                                .order('avg_rating', { ascending: false })
                                .limit(10);
        if (province_id) { 
            destQuery = destQuery.eq('province_id', province_id)
        }

        const {data :destinations, error :destError} = await destQuery ; 
        if (destError) throw destError;
        return res.json({
            month,
            season_summary: [...new Set(climateRows.map(r=>r.season))],
            province_id: province_id ? Number(province_id) : null,
            destinations
        })
    } catch (err) {
        console.error('[getSeasonalRecommendation] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};


export const getForYou = async (req, res) => {
    try {
        const userId = req.user.id
        const { data: userTagRows, error: userTagError } = await req.db.from('user_preference_tags')
                                                                        .select('tags ( id, name, slug )')
                                                                        .eq('user_id', userId);
        if (userTagError) throw userTagError;

        if (!userTagRows || userTagRows.length === 0) {
        return res.json({
            preference_tags: [],
            destinations: [],
            message: 'Belum ada preferensi. Atur dulu di halaman preferensi.',
        });
        }

        const preferenceTags = userTagRows.map(row => row.tags);
        const tagIds = preferenceTags.map(tag => tag.id);

        const { data : destTagRows , error: destTagError} = await supabase
                                                            .from('destination_tags')  
                                                            .select('destination_id')
                                                            .in('tag_id',tagIds)
        if (destTagError) throw destTagError;
        if (!destTagRows || destTagRows.length === 0) {
            return res.json({ preference_tags: preferenceTags, destinations: [] });
        }
        const scoreMap = {};
        const matchedTagMap = {};
 
        for (const row of destTagRows) {
            scoreMap[row.destination_id] = (scoreMap[row.destination_id] || 0) + 1;
        
            if (!matchedTagMap[row.destination_id]) {
                matchedTagMap[row.destination_id] = [];
            }
            matchedTagMap[row.destination_id].push(row.tag_id);
        }
 
        // urutkan berdasarkan skor tertinggi, ambil 10 teratas
        const topDestinationIds = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])
                                                            .slice(0, 10)
                                                            .map(([destId]) => destId);
                                            
        // ---- 4. Ambil detail destinasinya ----
        const { data: destinations, error: destError } = await supabase.from('destinations')
                                                                        .select(`
                                                                            id, name, description, category, cover_image_url,
                                                                            avg_rating, view_count,
                                                                            provinces ( id, code, name ),
                                                                            cities ( id, name )
                                                                        `)
                                                                        .in('id', topDestinationIds);
                                                                    
        if (destError) throw destError;
    

        const tagById = Object.fromEntries(preferenceTags.map(t => [t.id, t]));
        const destById = Object.fromEntries(destinations.map(d => [d.id, d]));
    
        const result = topDestinationIds.filter(id => destById[id])
                                        .map(id => ({
                                            ...destById[id],
                                            match_score: scoreMap[id],
                                            matched_tags: matchedTagMap[id]
                                            .map(tagId => tagById[tagId])
                                            .filter(Boolean),
                                        }));
    
        return res.json({
            preference_tags: preferenceTags,
            destinations: result,
        });
    } catch (err) {
        console.error('[getForYou] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};