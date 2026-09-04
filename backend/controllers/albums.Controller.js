import { supabase } from '../lib/supabase.js';

const DEST_FIELDS = `
    id, name, category, cover_image_url, avg_rating, view_count,
    provinces ( id, code, name ),
    cities ( id, name )
`;

const NAME_MAX = 60;

/** Nama album: wajib, tidak boleh spasi doang, dan dipangkas ujungnya. */
function readName(body) {
  const raw = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!raw) return { error: 'Album name is required' };
  if (raw.length > NAME_MAX) {
    return { error: `Album name must be at most ${NAME_MAX} characters` };
  }
  return { name: raw };
}

// Nama album unik per user (index albums_user_name_key). Ditangkap di sini
// supaya pemakainya dapat pesan yang bisa ditindaklanjuti, bukan 500.
function duplicateName(res, name) {
  return res.status(409).json({
    error: 'album_exists',
    message: `Album "${name}" sudah ada`,
  });
}

// GET /api/albums?destination_id=<uuid>
// destination_id opsional: kalau diisi, tiap album ikut membawa `contains`,
// yang dipakai pemilih album untuk mencentang kotak yang benar tanpa
// mengambil isi seluruh album.
export const listAlbums = async (req, res) => {
  try {
    const { destination_id } = req.query;

    const { data: albums, error } = await req.db
      .from('albums')
      .select('id, name, created_at, updated_at, album_items ( destination_id )')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const data = (albums || []).map((album) => {
      const items = album.album_items || [];
      return {
        id: album.id,
        name: album.name,
        created_at: album.created_at,
        updated_at: album.updated_at,
        item_count: items.length,
        ...(destination_id
          ? { contains: items.some((i) => i.destination_id === destination_id) }
          : {}),
      };
    });

    return res.json({ data });
  } catch (err) {
    console.error('[listAlbums] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/albums   Body: { name }
export const createAlbum = async (req, res) => {
  try {
    const { name, error: invalid } = readName(req.body);
    if (invalid) {
      return res.status(400).json({ error: 'invalid_body', message: invalid });
    }

    const { data, error } = await req.db
      .from('albums')
      .insert({ name, user_id: req.user.id })
      .select('id, name, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') return duplicateName(res, name);
      throw error;
    }

    return res.status(201).json({ data: { ...data, item_count: 0 } });
  } catch (err) {
    console.error('[createAlbum] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// GET /api/albums/:id
export const getAlbum = async (req, res) => {
  try {
    const { data: album, error } = await req.db
      .from('albums')
      .select('id, name, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!album) {
      return res.status(404).json({ error: 'not_found', message: 'Album not found' });
    }

    const { data: items, error: itemsError } = await req.db
      .from('album_items')
      .select(`added_at, destinations ( ${DEST_FIELDS} )`)
      .eq('album_id', album.id)
      .order('added_at', { ascending: false })
      .limit(200);

    if (itemsError) throw itemsError;

    const destinations = (items || [])
      // Destinasi yang dihapus meninggalkan baris tanpa join; jangan sampai
      // satu baris yatim jadi kartu kosong di frontend.
      .filter((row) => row.destinations)
      .map((row) => ({ added_at: row.added_at, ...row.destinations }));

    return res.json({
      data: { ...album, item_count: destinations.length, destinations },
    });
  } catch (err) {
    console.error('[getAlbum] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// PATCH /api/albums/:id   Body: { name }
export const updateAlbum = async (req, res) => {
  try {
    const { name, error: invalid } = readName(req.body);
    if (invalid) {
      return res.status(400).json({ error: 'invalid_body', message: invalid });
    }

    const { data, error } = await req.db
      .from('albums')
      .update({ name })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, name, created_at, updated_at')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return duplicateName(res, name);
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'Album not found' });
    }

    return res.json({ data });
  } catch (err) {
    console.error('[updateAlbum] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// DELETE /api/albums/:id
// Isinya ikut terhapus lewat ON DELETE CASCADE, tapi destinasinya tetap
// tersimpan -- membubarkan album bukan berarti membatalkan simpan.
export const deleteAlbum = async (req, res) => {
  try {
    const { data, error } = await req.db
      .from('albums')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'Album not found' });
    }

    return res.json({ deleted: true, id: data.id });
  } catch (err) {
    console.error('[deleteAlbum] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// PUT /api/destinations/:id/albums   Body: { album_ids: [uuid] }
//
// Mengganti seluruh keanggotaan album destinasi ini sekaligus, bukan
// menambah satu per satu: pemilihnya berupa daftar centang, dan mengirim
// keadaan akhir membuat operasinya idempoten -- tekan dua kali, hasilnya sama.
export const setDestinationAlbums = async (req, res) => {
  try {
    const destinationId = req.params.id;
    const { album_ids } = req.body || {};

    if (!Array.isArray(album_ids)) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'album_ids must be an array of album ids',
      });
    }

    const wanted = [
      ...new Set(album_ids.filter((id) => typeof id === 'string' && id)),
    ];

    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .select('id')
      .eq('id', destinationId)
      .maybeSingle();

    if (destError) throw destError;
    if (!destination) {
      return res.status(404).json({ error: 'not_found', message: 'Destination not found' });
    }

    // Semua album milik user diambil sekali: dipakai untuk memvalidasi yang
    // diminta sekaligus menentukan mana yang harus dilepas.
    const { data: mine, error: mineError } = await req.db
      .from('albums')
      .select('id')
      .eq('user_id', req.user.id);
    if (mineError) throw mineError;

    const mineIds = new Set((mine || []).map((a) => a.id));

    // Album orang lain tidak boleh dimasuki. RLS sudah menolaknya di level
    // baris, tapi tanpa pemeriksaan ini penolakannya muncul sebagai 500
    // alih-alih 404 yang jujur.
    if (wanted.some((id) => !mineIds.has(id))) {
      return res.status(404).json({
        error: 'not_found',
        message: 'One or more albums do not exist',
      });
    }

    // Masuk album berarti tersimpan. Tanpa ini ikon penanda di kartu bisa
    // padam sementara destinasinya ada di dalam album -- dan trigger
    // prune_album_items_on_unsave akan mengosongkan album itu diam-diam.
    if (wanted.length > 0) {
      const { error: saveError } = await req.db
        .from('saved_destinations')
        .upsert(
          { user_id: req.user.id, destination_id: destinationId },
          { onConflict: 'user_id,destination_id', ignoreDuplicates: true },
        );
      if (saveError) throw saveError;
    }

    const stale = [...mineIds].filter((id) => !wanted.includes(id));
    if (stale.length > 0) {
      const { error: delError } = await req.db
        .from('album_items')
        .delete()
        .eq('destination_id', destinationId)
        .in('album_id', stale);
      if (delError) throw delError;
    }

    if (wanted.length > 0) {
      const { error: insError } = await req.db
        .from('album_items')
        .upsert(
          wanted.map((album_id) => ({ album_id, destination_id: destinationId })),
          { onConflict: 'album_id,destination_id', ignoreDuplicates: true },
        );
      if (insError) throw insError;
    }

    return res.json({ data: { destination_id: destinationId, album_ids: wanted } });
  } catch (err) {
    console.error('[setDestinationAlbums] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
