import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import { listSavedDestinations } from '../controllers/savedDestination.Controller.js';
 
const router = express.Router();

/**
 * @swagger
 * /api/saved-destinations:
 *   get:
 *     summary: Daftar destinasi yang disimpan user, terbaru dulu
 *     description: >
 *       Mengembalikan destinasi yang sudah di-toggle simpan lewat
 *       POST /api/destinations/{id}/save. Tiap item sudah digabung
 *       (flatten) dengan data destinasinya, bukan nested.
 *     tags: [Saved Destinations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maksimal 100 destinasi tersimpan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       saved_id: { type: string, format: uuid, description: "id baris di saved_destinations" }
 *                       saved_at: { type: string, format: date-time }
 *                       id: { type: string, format: uuid, description: "id destinasi" }
 *                       name: { type: string }
 *                       category: { type: string }
 *                       cover_image_url: { type: string, nullable: true }
 *                       avg_rating: { type: number }
 *                       view_count: { type: integer }
 *                       provinces:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           code: { type: string }
 *                           name: { type: string }
 *                       cities:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           name: { type: string }
 *             example:
 *               data:
 *                 - saved_id: "1b2c3d4e-0000-0000-0000-000000000000"
 *                   saved_at: "2026-08-20T09:15:00.000Z"
 *                   id: "9f8e7d6c-0000-0000-0000-000000000000"
 *                   name: "Rammang-Rammang"
 *                   category: "Alam"
 *                   cover_image_url: null
 *                   avg_rating: 4.5
 *                   view_count: 128
 *                   provinces: { id: 21, code: "SN", name: "Sulawesi Selatan" }
 *                   cities: { id: 5, name: "Makassar" }
 *       401:
 *         description: Tidak ada/invalid token
 */
router.get('/', authMiddleware, globalLimiter, listSavedDestinations);
 
export default router;