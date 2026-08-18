import { supabase } from "../lib/supabase.js";

export const getMe = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('users')
      .select('id, email, full_name, avatar_url, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'User profile not found'
      });
    }

    return res.json({ user: data });
  } catch (err) {
    console.error('[getMe] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};