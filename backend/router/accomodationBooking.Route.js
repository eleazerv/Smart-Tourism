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
 *     summary: Buat booking akomodasi (bisa lebih dari satu kamar sekaligus)
 *     description: >
 *       Satu booking bisa berisi beberapa kamar (mis. rombongan yang butuh
 *       2 kamar), semuanya dibayar dalam satu invoice. Jumlah kamar yang
 *       dipesan mengikuti panjang array rooms -- sistem TIDAK menghitung
 *       otomatis dari jumlah tamu, karena preferensi pembagian kamar
 *       (mis. 8 orang jadi 2 kamar isi 4, atau 3 kamar isi lebih kecil)
 *       adalah keputusan pengguna, bukan sesuatu yang bisa ditebak server.
 *       Nama kamar (room_name) ditentukan otomatis oleh server. Jumlah
 *       malam dan harga dihitung dari data akomodasi yang tersimpan, bukan
 *       dari nilai yang dikirim client. Ketersediaan dicek berdasarkan
 *       room_count akomodasi dan booking aktif lain yang tanggalnya
 *       beririsan -- cek dulu lewat GET /api/accommodations/{id}/availability
 *       kalau mau tahu sisa kamar sebelum memesan.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accommodation_id, rooms]
 *             properties:
 *               accommodation_id: { type: string, format: uuid }
 *               rooms:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 5
 *                 items:
 *                   type: object
 *                   required: [check_in, check_out]
 *                   properties:
 *                     check_in:  { type: string, format: date, example: "2026-09-10" }
 *                     check_out: { type: string, format: date, example: "2026-09-13" }
 *                     guests:    { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       201:
 *         description: Booking dibuat dengan status pending, beserta daftar kamar (accommodation_booking_rooms)
 *       400:
 *         description: Tanggal tidak valid, rooms kosong, atau tamu melebihi kapasitas kamar
 *       404:
 *         description: Akomodasi tidak ditemukan
 *       409:
 *         description: Kamar tidak cukup untuk salah satu tanggal yang diminta
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
 *     description: Termasuk accommodation_booking_rooms -- daftar kamar dalam booking ini.
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
 *         description: Detail booking beserta data kamar dan akomodasinya
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
 *     description: >
 *       Tidak ada langkah "mengembalikan kamar" secara eksplisit --
 *       begitu payment_status berubah dari pending, kamar-kamar di
 *       booking ini otomatis tidak terhitung lagi di pengecekan
 *       ketersediaan booking berikutnya.
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