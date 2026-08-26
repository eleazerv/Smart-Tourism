import express from 'express';
import { authMiddleware, optionalAuth } from '../middleware/AuthMiddleware.js';
import { globalLimiter,moderateLimiter } from '../middleware/RateLimit.js';
import { getAccommodationById } from '../controllers/accommodations.Controller.js';
import { handleReviewPhotoUpload } from '../middleware/HandleReviewPhoto.js';
import { getAccommodationReviews,createAccommodationReview,deleteAccommodationReview } from '../controllers/accommodationreview.Controller.js';
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


/**
 * @swagger
 * /api/accommodations/{id}/reviews:
 *   get:
 *     summary: List review sebuah akomodasi
 *     tags: [Accommodation Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [recent, rating], default: recent }
 *     responses:
 *       200:
 *         description: Daftar review akomodasi
 *       400:
 *         description: sort tidak valid
 *   post:
 *     summary: Buat review baru untuk akomodasi ini (foto opsional)
 *     tags: [Accommodation Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *               photo: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Review berhasil dibuat
 *       400:
 *         description: rating tidak valid / tipe file tidak didukung / file terlalu besar
 *       404:
 *         description: Akomodasi tidak ditemukan
 *       409:
 *         description: User sudah pernah review akomodasi ini
 */
router.get('/:id/reviews', globalLimiter, optionalAuth, getAccommodationReviews);
router.post('/:id/reviews', authMiddleware, moderateLimiter, handleReviewPhotoUpload, createAccommodationReview);
 
/**
 * @swagger
 * /api/accommodations/reviews/{id}:
 *   delete:
 *     summary: Hapus review milik sendiri (foto ikut terhapus dari Storage)
 *     tags: [Accommodation Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: "deleted: true, id"
 *       404:
 *         description: Review tidak ditemukan atau bukan milik user ini
 */
router.delete('/reviews/:id', authMiddleware, moderateLimiter, deleteAccommodationReview);
 
export default router;
 