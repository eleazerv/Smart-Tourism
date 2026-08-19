import { supabase } from '../lib/supabase.js';


export const getPreferences = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('user_preference_tags')
      .select('tag_id, tags ( id, name, slug )')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const tags = data.map(row => row.tags);

    return res.json({ data: tags });
  } catch (err) {
    console.error('[getPreferences] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// PUT /api/preferences
// Body: { tag_ids: ["uuid1", "uuid2", ...] }
export const updatePreferences = async (req, res) => {
  try {
    const { tag_ids } = req.body;

    if (!Array.isArray(tag_ids)) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'tag_ids must be an array'
      });
    }

    const { error: deleteError } = await req.db
      .from('user_preference_tags')
      .delete()
      .eq('user_id', req.user.id);

    if (deleteError) throw deleteError;

    if (tag_ids.length === 0) {
      return res.json({ data: [] });
    }
    const rows = tag_ids.map(tagId => ({
      user_id: req.user.id,
      tag_id: tagId
    }));

    const { data, error: insertError } = await req.db
      .from('user_preference_tags')
      .insert(rows)
      .select('tag_id, tags ( id, name, slug )');

    if (insertError) throw insertError;

    const tags = data.map(row => row.tags);

    return res.json({ data: tags });
  } catch (err) {
    console.error('[updatePreferences] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
