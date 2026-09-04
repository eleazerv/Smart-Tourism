import { supabase } from "../lib/supabase.js";
 
const DEST_FIELDS = `
    id, name, category, cover_image_url, avg_rating, view_count,
    provinces ( id, code, name ),
    cities ( id, name )
`;
 

// POST /api/destinations/:id/save
export const toggleSaveDestination = async (req, res) => {
    try {
        const destinationId = req.params.id;
        const userId = req.user.id;
 
        const { data: existing , error: existingError } = await req.db
            .from('saved_destinations')
            .select('id')
            .eq('destination_id', destinationId)
            .eq('user_id', userId)
            .maybeSingle();
        
        if (existingError) throw existingError;

        if (existing) {
            const {error :delError} = await req.db.from('saved_destinations').delete().eq('id', existing.id);
            if (delError) throw delError;
            return res.json({ saved: false });
        }
 
        const { error } = await req.db
            .from('saved_destinations')
            .insert({ destination_id: destinationId, user_id: req.user.id });
 
        if (error) {
            if (error.code === '23503') {
                return res.status(404).json({
                    error: 'not_found',
                    message: 'Destination not found'
                });
            }
            if (error.code === '23505') {
                return res.json({ saved: true, already: true });
            }
            throw error;
        }
 
        return res.status(201).json({ saved: true });
    } catch (err) {
        console.error('[toggleSaveDestination] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
 
// GET /api/saved-destinations
export const listSavedDestinations = async (req, res) => {
    try {
        const { data, error } = await req.db
            .from('saved_destinations')
            .select(`id, created_at, destinations ( ${DEST_FIELDS} )`)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(100);
 
        if (error) throw error;
 
        // Album tiap baris diambil terpisah: album_items tidak punya foreign
        // key ke saved_destinations, jadi tidak bisa ikut di-nest oleh
        // PostgREST. Dua kueri, digabung di sini.
        const { data: memberships, error: memberError } = await req.db
            .from('album_items')
            .select('destination_id, albums!inner ( id, name, user_id )')
            .eq('albums.user_id', req.user.id);

        if (memberError) throw memberError;

        const albumsByDestination = new Map();
        for (const row of memberships || []) {
            const list = albumsByDestination.get(row.destination_id) || [];
            list.push({ id: row.albums.id, name: row.albums.name });
            albumsByDestination.set(row.destination_id, list);
        }

        const result = data.map(row => ({
            saved_id: row.id,
            saved_at: row.created_at,
            albums: albumsByDestination.get(row.destinations?.id) || [],
            ...row.destinations,
        }));
 
        return res.json({ data: result });
    } catch (err) {
        console.error('[listSavedDestinations] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};