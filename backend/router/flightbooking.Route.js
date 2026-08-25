import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter, strictLimiter } from '../middleware/RateLimit.js';
import {
  createFlightBooking,
  getFlightBooking,
  listFlightBookings,
  payFlightBooking,
  cancelFlightBooking,
} from '../controllers/flightBookings.Controller.js';

const router = express.Router();

// Semua endpoint booking wajib login.
router.use(authMiddleware);

/**
 * @swagger
 * /api/flight-bookings:
 *   post:
 *     summary: Buat booking penerbangan (kursi langsung dikurangi)
 *     description: >
 *       Satu booking berisi 1 penerbangan (sekali jalan) atau 2 penerbangan
 *       (pulang-pergi). Kursi dikurangi saat booking dibuat, bukan saat
 *       dibayar, supaya tidak ada dua orang yang mendapat kursi terakhir
 *       yang sama. Kalau pembayaran gagal atau kedaluwarsa, kursi otomatis
 *       dikembalikan lewat webhook.
 *       Satu booking berlaku untuk satu penumpang.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 2
 *                 items:
 *                   type: object
 *                   required: [flight_option_id, flight_type]
 *                   properties:
 *                     flight_option_id: { type: string, format: uuid }
 *                     flight_type: { type: string, enum: [outbound, return] }
 *     responses:
 *       201:
 *         description: Booking dibuat dengan status pending
 *       400:
 *         description: items tidak valid
 *       409:
 *         description: Kursi habis atau penerbangan sudah berangkat
 *   get:
 *     summary: Daftar booking penerbangan milik user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maksimal 50 booking terbaru
 */
router.post('/', moderateLimiter, createFlightBooking);
router.get('/', globalLimiter, listFlightBookings);

/**
 * @swagger
 * /api/flight-bookings/{id}:
 *   get:
 *     summary: Detail satu booking penerbangan beserta itemnya
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
 *         description: Detail booking
 *       404:
 *         description: Tidak ditemukan atau bukan milik user ini
 */
router.get('/:id', globalLimiter, getFlightBooking);

/**
 * @swagger
 * /api/flight-bookings/{id}/pay:
 *   post:
 *     summary: Buat invoice pembayaran Xendit untuk booking ini
 *     description: >
 *       Mengembalikan invoice_url yang harus dibuka user. Kalau invoice
 *       sebelumnya masih berlaku, link yang sama dipakai ulang. Status
 *       booking baru berubah setelah Xendit mengirim webhook, bukan di sini.
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
 *         description: Booking sudah dibayar atau tidak bisa dibayar
 *       502:
 *         description: Xendit tidak bisa dihubungi
 */
router.post('/:id/pay', strictLimiter, payFlightBooking);

/**
 * @swagger
 * /api/flight-bookings/{id}/cancel:
 *   post:
 *     summary: Batalkan booking yang belum dibayar dan kembalikan kursinya
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
 *         description: Booking dibatalkan, kursi dikembalikan
 *       409:
 *         description: Booking sudah dibayar
 */
router.post('/:id/cancel', moderateLimiter, cancelFlightBooking);

export default router;