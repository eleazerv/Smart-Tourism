import { supabase } from "../lib/supabase.js";
const PAGE_SIZE = 15; 

async function getSavedIdSet(db, userId, destinationIds) {
    if (!userId || destinationIds.length === 0) return new Set();
 
    const { data } = await db
        .from('saved_destinations')
        .select('destination_id')
        .eq('user_id', userId)
        .in('destination_id', destinationIds);
 
    return new Set((data || []).map(r => r.destination_id));
}

export const getDestinations = async (req,res) => { 
    try{ 
        const {q,tags,province_id,city_id,min_rating,page} = req.query;
        const currentPage = Math.max(parseInt(page) ||1,1)
        const from = (currentPage - 1) * PAGE_SIZE 
        const to = currentPage * PAGE_SIZE - 1

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

        let DestinationIdsFromTags = null 
        const tagSlugs = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null;

        const { data, error } = await supabase.rpc('search_destinations', {
            q: q || null,
            tag_slugs: tagSlugs,
            filter_province_id: province_id ? Number(province_id) : null,
            filter_city_id: city_id ? Number(city_id) : null,
            filter_min_rating: minRatingNum,
            page_number: currentPage,
            page_size: PAGE_SIZE,
            });


        if (error) throw error;
        const total = data.length > 0 ? Number(data[0].total_count) : 0;
        
        if (total === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Destinations not found' });
        }

        const saveIds = await getSavedIdSet(req.db, req.user?.id, data.map(row => row.id));
        const destinations = data.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            latitude: row.latitude,
            longitude: row.longitude,
            cover_image_url: row.cover_image_url,
            avg_rating: row.avg_rating,
            view_count: row.view_count,
            is_saved: saveIds.has(row.id),
            provinces: {
                id: row.province_id,
                code: row.province_code,
                name: row.province_name,
            },
            cities: {
                id: row.city_id,
                name: row.city_name,
            },
        }));

        return res.json({
        data: destinations,
        page: currentPage,
        total,
        total_pages: Math.ceil(total / PAGE_SIZE),
        });
    }catch (err) { 
        console.error('[getDestinations] error', err);
        return res.status(500).json({ error: 'server_error' });
    
    }
}


// Halaman detail butuh nama provinsi/kota dan tag-nya, bukan cuma kolom mentah
// destinations, jadi relasinya ikut di-join di sini.
const DETAIL_FIELDS = `
    id, name, description, category, latitude, longitude,
    cover_image_url, avg_rating, view_count, province_id, city_id,
    provinces ( id, code, name ),
    cities ( id, name ),
    destination_tags ( tags ( id, name, slug ) )
`;

export const getDestinationById = async ( req,res) => {     
    const destinationId = req.params.id; 
    try { 
        const { data, error } = await supabase
                                    .from('destinations')
                                    .select(DETAIL_FIELDS)
                                    .eq('id', destinationId)
                                    .maybeSingle();
        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'not_found', message: 'Destination not found' });
        }

        const savedIds = await getSavedIdSet(req.db, req.user?.id, [destinationId]);

        // Ratakan tabel pivot jadi array tag biasa supaya client tidak perlu tahu
        // soal destination_tags.
        const { destination_tags, ...destination } = data;
        return res.json({
            data: {
                ...destination,
                tags: (destination_tags ?? []).map(link => link.tags).filter(Boolean),
                is_saved: savedIds.has(destinationId),
            },
        });
    } catch (err) { 
        console.error('[getDestinationById] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}

export const getTrendingDestinations = async (req,res) =>{ 
    try { 
        const { period ='7d' ,} = req.query; 
        
        if(!['7d','30d','all'].includes(period)) { 
            return res.status(400).json({ error: 'invalid_period',message:'period must be 7d, 30d, or all' });
        }

        if (period ==='all' ) { 
            const { data,error} = await supabase
                                        .from('destinations')
                                        .select('id, name, cover_image_url, avg_rating, view_count')
                                        .order('view_count', { ascending: false })
                                        .limit(10); 
            
            if (error) throw error;

            const savedIds = await getSavedIdSet(req.db, req.user?.id, data.map(d => d.id));
            const result = data.map(d => ({ ...d, is_saved: savedIds.has(d.id) }));

            return res.json({ data : result, period });
        }

        const days = period === '7d' ? 7 : 30;
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: viewRows , error: viewError} = await supabase
                                                            .from('destination_views')
                                                            .select('destination_id')
                                                            .gte('viewed_at',sinceDate) ; 

        if (viewError) throw viewError;

        if (viewRows.length === 0) { 
            return res.json ({data:[], period})
        }

        const countMap = {}; 

        for (const row of viewRows) {
             countMap[row.destination_id] = (countMap[row.destination_id] || 0) + 1;
        }

        const topDestinationIds = Object.entries(countMap)
                                        .sort((a,b) => b[1] - a[1])
                                        .slice(0,10)
                                        .map(([destId]) =>destId) ; 

        const {data : destinations, error : destError} = await supabase
                                                            .from('destinations')
                                                            .select('id, name, cover_image_url, avg_rating, view_count')
                                                            .in('id',topDestinationIds)
        if (destError) throw destError;
        const savedIds = await getSavedIdSet(req.db, req.user?.id, topDestinationIds);


        const destMap = Object.fromEntries(destinations.map(d => [d.id,d]))
        const result = topDestinationIds.map(id => destMap[id] ? { ...destMap[id], recent_views: countMap[id], is_saved: savedIds.has(id) } : null)
                                        .filter(Boolean);
                    
        return res.json({ data: result, period });            
    }catch (err) { 
            console.error('[getTrendingDestinations] error', err);
            return res.status(500).json({ error: 'server_error' });
    }
}

// logic utk tambah view count
export const postView = async ( req,res) => { 
    try { 
        if (req.skipViewTracking) { 
            return res.json({tracked:false, message:'View tracking skipped'});
        }
        const destinationId = req.params.id; 
        const { error: insertError} = await supabase.from('destination_views')
        .insert({
            destination_id: destinationId,
            user_id: req.user?.id || null,
        })

        if (insertError) throw insertError;
       
        const { error : rpcError } = await supabase.rpc('increment_view_count', { dest_id: destinationId });
        if (rpcError) throw rpcError;
        return res.json({ tracked: true });

    }catch (err) { 
        console.error('[postView] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}