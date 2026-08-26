import express from 'express';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import { authMiddleware, optionalAuth } from '../middleware/AuthMiddleware.js';
import {
  estimateBudget,
  getBudgetHistory,
} from '../controllers/budget.Controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/budget/estimate:
 *   post:
 *     summary: Hitung estimasi budget trip (flight + akomodasi + makan)
 *     description: >
 *       Guest boleh pakai endpoint ini tanpa login, tapi hasilnya tidak
 *       tersimpan ke riwayat. User login otomatis tersimpan ke budget_estimates.
 *     tags: [Budget]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destination_id, origin_city_id, tier, duration_days, travelers]
 *             properties:
 *               destination_id: { type: string, format: uuid }
 *               origin_city_id: { type: integer }
 *               tier: { type: string, enum: [budget, mid, luxury] }
 *               duration_days: { type: integer, minimum: 1 }
 *               travelers: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: breakdown lengkap + total_estimate_min/max
 *       400:
 *         description: input tidak valid
 *       404:
 *         description: Destinasi/penerbangan/akomodasi tidak ditemukan
 */
router.post('/estimate', optionalAuth, moderateLimiter, estimateBudget);

/**
 * @swagger
 * /api/budget/history:
 *   get:
 *     summary: Riwayat estimasi budget milik user yang login
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar riwayat estimasi (maksimal 20 terbaru)
 *       401:
 *         description: Tidak ada/invalid token
 */
router.get('/history', authMiddleware, globalLimiter, getBudgetHistory);

export default router;