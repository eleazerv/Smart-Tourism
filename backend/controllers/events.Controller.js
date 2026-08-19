import { supabase } from "../lib/supabase.js";

export const getEvents = async (req, res) => {
    try {
        const { month, province_id, city_id } = req.query;
        if (month && (Number(month) < 1 || Number(month) > 12)) {
            return res.status(400).json({
                error: 'invalid_month',
                message: 'month must be between 1 and 12'
            });
        }
        let query = supabase
            .from('events')
            .select(`id,name,month,start_date,description,cities!inner(id, name, province_id, provinces(id, code, name))`);

        if (month) {
            query = query.eq('month', Number(month));
        }
        if (city_id) {
            query = query.eq('city_id', city_id);
        }
        if (province_id) {
            query = query.eq('cities.province_id', province_id);
        }

        query = query.order('month', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        return res.json({ data });
    } catch (err) {
        console.error('[getEvents] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};

export const getEventById = async (req, res) => {
    const eventId = req.params.id;
    try {
        const { data, error } = await supabase
            .from('events')
            .select(`
                id,name,held_by,month,start_date,end_date,latitude,
                longitude,description,is_annual,destination_id,
                cities(id, name, province_id, provinces(id, code, name))
            `)
            .eq('id', eventId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Event not found'
            });
        }

        return res.json({ data });
    } catch (err) {
        console.error('[getEventById] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
