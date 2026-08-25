import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter, strictLimiter } from '../middleware/RateLimit.js';
import { createAccommodationBooking, getAccommodationBooking, listAccommodationBookings, cancelAccommodationBooking,payAccommodationBooking } from '../controllers/Accomodationbookings.controller.js';
const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/accommodation-bookings:
 *   post:
 *     summary: Buat booking akomodasi
 *     description: >
 *       Jumlah malam dan total harga dihitung di server dari harga
 *       akomodasi yang tersimpan, bukan dari nilai yang dikirim client.
 *       Ketersediaan kamar tidak dicek karena tabel accommodations tidak
 *       menyimpan jumlah kamar.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accommodation_id, check_in, check_out]
 *             properties:
 *               accommodation_id: { type: string, format: uuid }
 *               check_in:  { type: string, format: date, example: "2026-09-10" }
 *               check_out: { type: string, format: date, example: "2026-09-13" }
 *               guests:    { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       201:
 *         description: Booking dibuat dengan status pending
 *       400:
 *         description: Tanggal tidak valid atau tamu melebihi kapasitas
 *       404:
 *         description: Akomodasi tidak ditemukan
 *   get:
 *     summary: Daftar booking akomodasi milik user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maksimal 50 booking terbaru
 */
router.post('/', moderateLimiter, createAccommodationBooking);
router.get('/', globalLimiter, listAccommodationBookings);

/**
 * @swagger
 * /api/accommodation-bookings/{id}:
 *   get:
 *     summary: Detail satu booking akomodasi
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail booking beserta data akomodasinya
 *       404:
 *         description: Tidak ditemukan atau bukan milik user ini
 */
router.get('/:id', globalLimiter, getAccommodationBooking);

/**
 * @swagger
 * /api/accommodation-bookings/{id}/pay:
 *   post:
 *     summary: Buat invoice pembayaran Xendit untuk booking akomodasi
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Invoice baru dibuat
 *       200:
 *         description: Invoice lama masih berlaku dan dipakai ulang
 *       409:
 *         description: Booking sudah dibayar
 *       502:
 *         description: Xendit tidak bisa dihubungi
 */
router.post('/:id/pay', strictLimiter, payAccommodationBooking);

/**
 * @swagger
 * /api/accommodation-bookings/{id}/cancel:
 *   post:
 *     summary: Batalkan booking akomodasi yang belum dibayar
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking dibatalkan
 *       409:
 *         description: Booking sudah dibayar
 */
router.post('/:id/cancel', moderateLimiter, cancelAccommodationBooking);

export default router;