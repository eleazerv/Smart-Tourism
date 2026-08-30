import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import {
  getTripBooking,
  listTripBookings,
  payTripBooking,
  cancelTripBooking,
} from '../controllers/tripBooking.Controller.js';

const router = express.Router();

// Seluruh endpoint di sini mengubah/membaca booking milik pengguna sendiri.
router.use(authMiddleware);

/**
 * @swagger
 * /api/trip-bookings:
 *   get:
 *     summary: Daftar semua trip booking milik pengguna
 *     description: >
 *       Ringkasan tiap trip booking (tanpa rincian sub-booking di dalamnya --
 *       pakai GET /api/trip-bookings/{id} untuk itu). Booking pending yang
 *       tenggatnya sudah lewat otomatis ditandai gagal sebelum ditampilkan.
 *     tags: [TripBookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar trip booking, terbaru lebih dulu (maks 50)
 */
router.get('/', globalLimiter, listTripBookings);

/**
 * @swagger
 * /api/trip-bookings/{id}:
 *   get:
 *     summary: Detail satu trip booking beserta seluruh sub-booking di dalamnya
 *     description: >
 *       Mengembalikan trip_booking lengkap dengan flight_bookings dan
 *       accommodation_bookings yang dinaungi satu invoice ini (termasuk
 *       rincian kamar per akomodasi). Booking pending yang tenggatnya sudah
 *       lewat otomatis ditandai gagal sebelum ditampilkan.
 *     tags: [TripBookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Detail trip booking }
 *       404: { description: Booking tidak ditemukan atau bukan milik Anda }
 */
router.get('/:id', globalLimiter, getTripBooking);

/**
 * @swagger
 * /api/trip-bookings/{id}/pay:
 *   post:
 *     summary: Buat atau ambil ulang link pembayaran Xendit untuk trip booking ini
 *     description: >
 *       Satu invoice mencakup SELURUH sub-booking (semua leg penerbangan +
 *       semua akomodasi) yang dinaungi trip booking ini -- dibayar sekali,
 *       bukan per sub-booking. Kalau invoice yang masih berlaku sudah ada,
 *       link yang sama dikembalikan (reused: true) alih-alih membuat invoice
 *       baru.
 *     tags: [TripBookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invoice yang sudah ada dan masih berlaku dikembalikan (reused true) }
 *       201: { description: Invoice baru dibuat }
 *       404: { description: Booking tidak ditemukan }
 *       409:
 *         description: >
 *           Booking sudah lunas (already_paid), sudah tidak pending
 *           (booking_not_payable), atau tenggat pembayarannya sudah lewat
 *           (booking_expired)
 *       502: { description: Gagal membuat invoice di Xendit }
 */
router.post('/:id/pay', moderateLimiter, payTripBooking);

/**
 * @swagger
 * /api/trip-bookings/{id}/cancel:
 *   post:
 *     summary: Batalkan trip booking yang belum dibayar
 *     description: >
 *       Membatalkan SELURUH sub-booking di bawah trip booking ini sekaligus
 *       (kursi penerbangan dilepas, kamar akomodasi dibebaskan lewat
 *       cascade di settle_booking). Invoice Xendit yang sudah dibuat ikut
 *       di-expire. Tidak bisa dipakai untuk booking yang sudah lunas.
 *     tags: [TripBookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking dibatalkan }
 *       404: { description: Booking tidak ditemukan }
 *       409:
 *         description: >
 *           Sudah lunas (already_paid), atau statusnya sudah bukan pending
 *           (booking_not_cancellable, misal sudah failed/refunded sebelumnya)
 */
router.post('/:id/cancel', moderateLimiter, cancelTripBooking);

export default router;