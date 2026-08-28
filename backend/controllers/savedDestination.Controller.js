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
 
        const { data: existing } = await req.db
            .from('saved_destinations')
            .select('id')
            .eq('destination_id', destinationId)
            .eq('user_id', userId)
            .maybeSingle();
        
        if (existingError) throw existingError;

        if (existing) {
            await req.db.from('saved_destinations').delete().eq('id', existing.id);
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
 
        const result = data.map(row => ({
            saved_id: row.id,
            saved_at: row.created_at,
            ...row.destinations,
        }));
 
        return res.json({ data: result });
    } catch (err) {
        console.error('[listSavedDestinations] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};