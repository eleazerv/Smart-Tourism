import express from 'express';
import { globalLimiter } from '../middleware/RateLimit.js';
import { getAccommodationById } from '../controllers/accommodations.Controller.js';
const router = express.Router();

/**
 * @swagger
 * /api/accommodations/{id}:
 *   get:
 *     summary: Detail satu akomodasi
 *     tags: [Accommodations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail akomodasi lengkap dengan kota & provinsi
 *       404:
 *         description: Akomodasi tidak ditemukan
 */
router.get('/:id', globalLimiter, getAccommodationById);

export default router;