import express from 'express';
import { supabase } from '../lib/supabase.js';
import { globalLimiter } from '../middleware/RateLimit.js';

const router = express.Router();

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Daftar kota (untuk memilih rute penerbangan)
 *     description: >
 *       Dibutuhkan frontend karena pencarian penerbangan memakai id kota,
 *       bukan nama. Kota yang menjadi hub penerbangan ditandai is_major_hub.
 *     tags: [Cities]
 *     parameters:
 *       - in: query
 *         name: hub_only
 *         schema: { type: boolean }
 *         description: Kalau true, hanya kota hub yang punya banyak rute
 *     responses:
 *       200:
 *         description: Daftar kota beserta provinsinya
 */
router.get('/', globalLimiter, async (req, res) => {
  try {
    let query = supabase
      .from('cities')
      .select('id, name, is_major_hub, provinces ( id, code, name )')
      .order('name');

    if (req.query.hub_only === 'true') {
      query = query.eq('is_major_hub', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ data });
  } catch (err) {
    console.error('[getCities] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;