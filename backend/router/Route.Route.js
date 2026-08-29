import express from 'express';
import { estimateDrivingRoute } from '../lib/openroute.js';
import { moderateLimiter } from '../middleware/RateLimit.js';

const router = express.Router();

/**
 * @swagger
 * /api/route:
 *   get:
 *     summary: Rute jalan darat antara dua titik koordinat mana pun
 *     description: >
 *       Dipakai peta rencana untuk menggambar garis rute saat pengguna
 *       memilih dua penanda (destinasi, penginapan, atau bandara). Terpisah
 *       dari tool AI estimate_route -- endpoint ini dipanggil langsung dari
 *       klik di peta, jadi tidak memakai token sama sekali. Hanya untuk
 *       jalur darat; dua titik yang terpisah laut akan mengembalikan
 *       routable:false, bukan error.
 *     tags: [Route]
 *     parameters:
 *       - in: query
 *         name: from_lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: from_lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: to_lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: to_lng
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: >
 *           routable, distance_km, duration_minutes, dan geometry (array
 *           [lat,lng] siap dipakai Leaflet L.polyline). Kalau routable
 *           false, geometry tidak ada dan message menjelaskan alasannya.
 *       400:
 *         description: Koordinat tidak lengkap atau bukan angka
 */
router.get('/', moderateLimiter, async (req, res) => {
  try {
    const { from_lat, from_lng, to_lat, to_lng } = req.query;

    const coords = { from_lat, from_lng, to_lat, to_lng };
    for (const [key, val] of Object.entries(coords)) {
      if (val === undefined || val === '' || Number.isNaN(Number(val))) {
        return res.status(400).json({
          error: 'invalid_query',
          message: `${key} wajib diisi dan harus berupa angka`,
        });
      }
    }

    const result = await estimateDrivingRoute({
      fromLat: Number(from_lat), fromLng: Number(from_lng),
      toLat: Number(to_lat), toLng: Number(to_lng),
    });

    return res.json({ data: result });
  } catch (err) {
    if (err.message === 'ORS_REQUEST_FAILED') {
      console.error('[GET /api/route] ORS error', err.status, err.detail);
      return res.status(502).json({
        error: 'route_service_unavailable',
        message: 'Layanan rute sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
      });
    }
    console.error('[GET /api/route] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;