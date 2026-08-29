import express from 'express';
import { authMiddleware, optionalAuth } from '../middleware/AuthMiddleware.js';
import { globalLimiter,moderateLimiter } from '../middleware/RateLimit.js';
import { getAccommodations, getAccommodationById, getAccommodationAvailability } from '../controllers/accommodations.Controller.js';
import { handleReviewPhotoUpload } from '../middleware/HandleReviewPhoto.js';
import { getAccommodationReviews,createAccommodationReview,deleteAccommodationReview } from '../controllers/accommodationreview.Controller.js';
const router = express.Router();

/**
 * @swagger
 * /api/accommodations:
 *   get:
 *     summary: List & cari akomodasi (halaman mandiri, tidak lewat destinasi)
 *     description: >
 *       Untuk halaman akomodasi yang berdiri sendiri -- beda dari
 *       GET /api/destinations/{id}/accommodations yang selalu butuh
 *       destinasi sebagai acuan jarak. Endpoint ini tidak menghitung
 *       distance_km sama sekali, karena tidak ada titik acuan.
 *     tags: [Accommodations]
 *     parameters:
 *       - in: query
 *         name: city_id
 *         schema: { type: integer }
 *       - in: query
 *         name: province_id
 *         schema: { type: integer }
 *       - in: query
 *         name: tier
 *         schema: { type: string, enum: [budget, mid, luxury] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari berdasarkan nama akomodasi
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: data, page, total, total_pages
 *       400:
 *         description: tier tidak valid
 *       404:
 *         description: Tidak ada akomodasi yang cocok dengan filter
 */
router.get('/', globalLimiter, getAccommodations);

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
 * /api/accommodations/{id}/availability:
 *   get:
 *     summary: Cek sisa kamar untuk rentang tanggal tertentu (tanpa membuat booking)
 *     description: >
 *       Read-only, tidak mengunci atau mengubah data apa pun -- aman
 *       dipanggil berkali-kali untuk preview sebelum pengguna memutuskan
 *       memesan. Angka yang dikembalikan bisa berubah kalau ada orang lain
 *       memesan di antara pemanggilan ini dan booking sungguhan --
 *       kepastian akhir tetap ditentukan saat POST /api/accommodation-bookings.
 *     tags: [Accommodations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: check_in
 *         required: true
 *         schema: { type: string, format: date, example: "2026-09-10" }
 *       - in: query
 *         name: check_out
 *         required: true
 *         schema: { type: string, format: date, example: "2026-09-13" }
 *     responses:
 *       200:
 *         description: room_count, booked, available
 *       400:
 *         description: check_in/check_out tidak diisi atau tidak valid
 *       404:
 *         description: Akomodasi tidak ditemukan
 */
router.get('/:id/availability', globalLimiter, getAccommodationAvailability);

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