import { supabaseAdmin } from '../lib/supabase.js';

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

const MAX_NAME_LENGTH = 60;

// PATCH /api/auth/me
// Body: { full_name: "Nama Baru" }
export const updateMe = async (req, res) => {
  try {
    const { full_name } = req.body ?? {};

    if (typeof full_name !== 'string') {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'full_name must be a string'
      });
    }

    const name = full_name.trim();

    if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        error: 'invalid_body',
        message: `full_name must be between 2 and ${MAX_NAME_LENGTH} characters`
      });
    }

    const FIELDS = 'id, email, full_name, avatar_url, role, created_at';

    let { data, error } = await req.db
      .from('users')
      .update({ full_name: name })
      .eq('id', req.user.id)
      .select(FIELDS)
      .maybeSingle();

    if (error) throw error;

    // The user-scoped client only writes when `users` carries an UPDATE policy
    // for the row owner; without one the statement touches nothing and returns
    // no row. The id comes from the verified token, so re-running it as admin
    // still only ever writes the caller's own row.
    if (!data) {
      const admin = await supabaseAdmin
        .from('users')
        .update({ full_name: name })
        .eq('id', req.user.id)
        .select(FIELDS)
        .maybeSingle();

      if (admin.error) throw admin.error;
      data = admin.data;
    }

    if (!data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'User profile not found'
      });
    }

    // Keep the auth metadata in step: the frontend header reads the name from
    // the session claims rather than from this table.
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { user_metadata: { ...req.user.user_metadata, full_name: name } }
    );

    if (metaError) console.error('[updateMe] metadata sync failed', metaError);

    return res.json({ user: data });
  } catch (err) {
    console.error('[updateMe] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
