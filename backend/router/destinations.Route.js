import express from "express";
import { getDestinations, getDestinationById, getTrendingDestinations, postView } from '../controllers/destinations.Controller.js'
import { globalLimiter } from "../middleware/RateLimit.js";
import { dedupView } from "../middleware/Dedup.js";
import { optionalAuth } from "../middleware/AuthMiddleware.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { moderateLimiter } from "../middleware/RateLimit.js";
import { handleReviewPhotoUpload } from "../middleware/HandleReviewPhoto.js";
import { getReviews, createReview, deleteReview, likeReview } from "../controllers/reviews.Controller.js";
const router = express.Router();

/**
 * @swagger
 * /api/destinations:
 *   get:
 *     summary: List & search destinasi
 *     tags: [Destinations]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari di nama/deskripsi destinasi, sekaligus nama provinsi & kota
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: Slug tag dipisah koma, contoh 'pantai,diving'
 *       - in: query
 *         name: province_id
 *         schema: { type: integer }
 *       - in: query
 *         name: city_id
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: data, page, total, total_pages
 */
router.get("/", globalLimiter, getDestinations);

/**
 * @swagger
 * /api/destinations/trending:
 *   get:
 *     summary: Destinasi paling banyak dilihat
 *     tags: [Destinations]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [7d, 30d, all], default: 7d }
 *     responses:
 *       200:
 *         description: data, period
 *       400:
 *         description: period tidak valid
 */
router.get("/trending", globalLimiter, getTrendingDestinations);

/**
 * @swagger
 * /api/destinations/{id}:
 *   get:
 *     summary: Detail satu destinasi
 *     tags: [Destinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: data (null kalau tidak ditemukan)
 */
router.get("/:id", globalLimiter, getDestinationById);

/**
 * @swagger
 * /api/destinations/{id}/view:
 *   post:
 *     summary: Catat view destinasi (dedup 24 jam per user/IP)
 *     tags: [Destinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: "tracked: true/false"
 */
router.post("/:id/view", globalLimiter, optionalAuth, dedupView, postView);

/**
 * @swagger
 * /api/destinations/{id}/reviews:
 *   get:
 *     summary: List review sebuah destinasi
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [recent, likes], default: recent }
 *     responses:
 *       200:
 *         description: Daftar review, tiap item punya like_count
 *   post:
 *     summary: Buat review baru untuk destinasi ini (foto opsional)
 *     tags: [Reviews]
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
 *         description: Destinasi tidak ditemukan
 *       409:
 *         description: User sudah pernah review destinasi ini
 */
router.get('/:id/reviews', globalLimiter, optionalAuth, getReviews);
router.post('/:id/reviews', authMiddleware, moderateLimiter, handleReviewPhotoUpload, createReview);

/**
 * @swagger
 * /api/destinations/reviews/{id}:
 *   delete:
 *     summary: Hapus review milik sendiri (foto ikut terhapus dari Storage)
 *     tags: [Reviews]
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
router.delete('/reviews/:id', authMiddleware, moderateLimiter, deleteReview);

/**
 * @swagger
 * /api/destinations/reviews/{id}/like:
 *   post:
 *     summary: Toggle like/unlike review
 *     description: Kalau belum like -> like. Kalau sudah like -> unlike.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: "liked: false (baru saja unlike)"
 *       201:
 *         description: "liked: true (baru saja like)"
 */
router.post('/reviews/:id/like', authMiddleware, moderateLimiter, likeReview);

export default router;