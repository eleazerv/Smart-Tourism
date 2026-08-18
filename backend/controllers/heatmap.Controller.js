import { supabase } from '../lib/supabase.js';

export const getHeatmap = async (req, res) => {
  try {
    const { period } = req.query;

    let query = supabase
      .from('visitor_stats')
      .select(`
        visitor_count,
        period,
        provinces ( code, name )
      `);

    if (period) {
      query = query.eq('period', period);
    } else {
      const { data: latest } = await supabase
        .from('visitor_stats')
        .select('period')
        .order('period', { ascending: false })
        .limit(1)
        .single();

      if (latest) query = query.eq('period', latest.period);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = data.map(row => ({
      province_code: row.provinces.code,
      province_name: row.provinces.name,
      visitor_count: row.visitor_count
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error('[getHeatmap] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};