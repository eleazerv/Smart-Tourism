import express from 'express';
import { globalLimiter } from "../middleware/RateLimit.js";
import { getForYou, getRecommendations } from '../controllers/recommendations.Controller.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Rekomendasi destinasi musiman (publik, tidak butuh login)
 *     description: >
 *       Tanpa province_id, mengembalikan destinasi lintas provinsi yang cocok
 *       untuk bulan tersebut. Dengan province_id, fokus ke satu provinsi.
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Default bulan sekarang kalau tidak dikirim
 *       - in: query
 *         name: province_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: month, season_summary, destinations (maksimal 10)
 *       400:
 *         description: month di luar rentang 1-12
 */
router.get("/", globalLimiter, getRecommendations);

/**
 * @swagger
 * /api/recommendations/for-you:
 *   get:
 *     summary: Rekomendasi personalized berdasarkan preferensi user
 *     description: >
 *       Content-based filtering — cocokkan tag preferensi user (user_preference_tags)
 *       dengan tag destinasi. Diurutkan berdasarkan match_score (jumlah tag yang cocok).
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: preference_tags, destinations (dengan match_score & matched_tags)
 *       401:
 *         description: Tidak ada/invalid token
 */
router.get("/for-you", authMiddleware, globalLimiter, getForYou);

export default router;