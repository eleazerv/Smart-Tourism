import express from "express";
import { globalLimiter } from "../middleware/RateLimit.js";
import { getHeatmap } from '../controllers/heatmap.Controller.js'
const router = express.Router();

/**
 * @swagger
 * /api/heatmap:
 *   get:
 *     summary: Data kunjungan wisatawan per provinsi (untuk peta heatmap)
 *     tags: [Heatmap]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *         description: Format YYYY-MM. Kalau tidak dikirim, fallback ke period terbaru di data.
 *     responses:
 *       200:
 *         description: Daftar province_code, province_name, visitor_count
 */
router.get("/", globalLimiter, getHeatmap);
export default router;