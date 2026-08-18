import { supabase } from "../lib/supabase.js";
const PAGE_SIZE = 15; 

export const getDestinations = async (req,res) => { 
    try{ 
        const {q,tags,province_id,city_id,page} = req.query;
        const currentPage = Math.max(parseInt(page) ||1,1)
        const from = (currentPage - 1) * PAGE_SIZE 
        const to = currentPage * PAGE_SIZE - 1

        let DestinationIdsFromTags = null 
        if(tags){
            const tagSlugs = tags.split(',').map(t=>t.trim()).filter(Boolean) ; 
            
            const {data : tagRows ,error: tagError} =  await supabase
                                                            .from("tags")
                                                            .select("id")
                                                            .in("slug",tagSlugs)
            if (tagError) throw tagError;
            const tagIds = tagRows.map(t => t.id)

            if (tagIds.length == 0 ){ 
                return res.json({ data: [], page: currentPage, total: 0, total_pages: 0 });
            }

            const { data : destTagRows, error: destTagError} = await supabase
                                                                    .from('destination_tags')
                                                                    .select('destination_id')
                                                                    .in('tag_id',tagIds)
            if (destTagError) throw destTagError;

            DestinationIdsFromTags = [...new Set(destTagRows.map(r => r.destination_id))];
            if (DestinationIdsFromTags.length === 0) {
                return res.json({ data: [], page: currentPage, total: 0, total_pages: 0 });
            }
        }

        let query = supabase.from('destinations').select(`id,name,description,category,latitude,longitude,cover_image_url,avg_rating,view_count,provinces(id,code,name),cities(id,name)`,{count: 'exact'});
        
        if (q) { 
            query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
        }

        if (province_id) { 
            query = query.eq('province_id',province_id);
        }

        if (city_id) { 
            query = query.eq('city_id',city_id);
        }

        if (DestinationIdsFromTags) {
            query = query.in('id',DestinationIdsFromTags);
        }

        query = query.order ('created_at', { ascending: false }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        return res.json({
            data,
            page: currentPage,
            total: count,
            total_pages: Math.ceil(count / PAGE_SIZE)
        });
    }catch (err) { 
        console.error('[getDestinations] error', err);
        return res.status(500).json({ error: 'server_error' });
    
    }
}


export const getDestinationById = async ( req,res) => {     
    const destinationId = req.params.id; 
    try { 
        const { data, error } = await supabase
                                    .from('destinations')
                                    .select('*')
                                    .eq('id', destinationId)
                                    .maybeSingle();
        if (error) throw error;
        return res.json({ data });
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
            return res.json({ data, period });
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

        const destMap = Object.fromEntries(destinations.map(d => [d.id,d]))
        const result = topDestinationIds
                        .map(id => destMap[id] ? { ...destMap[id], recent_views: countMap[id] } : null)
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