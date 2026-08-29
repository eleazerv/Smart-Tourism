import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter, strictLimiter } from '../middleware/RateLimit.js';
import {
  createFlightBooking,
  getFlightBooking,
  listFlightBookings,
  payFlightBooking,
  cancelFlightBooking,
  listFlightTickets,
  getFlightTicketDetail,
  claimFlightSeat,
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
 *       dikembalikan lewat webhook. Satu booking bisa berisi banyak
 *       penumpang (maksimal 10 orang) -- satu tiket diterbitkan per orang
 *       per leg (PP = 2 tiket per orang).
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, passenger_names]
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
 *               passenger_names:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                 description: Nama tiap penumpang. Jumlah kursi yang dipotong mengikuti panjang array ini.
 *     responses:
 *       201:
 *         description: Booking dibuat dengan status pending, beserta daftar tiket per penumpang per leg
 *       400:
 *         description: items atau passenger_names tidak valid
 *       404:
 *         description: flight_option_id tidak ditemukan
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
 *     summary: Detail satu booking penerbangan beserta tiketnya
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
 *         description: Detail booking, termasuk tickets (1 per orang per leg)
 *       404:
 *         description: Tidak ditemukan atau bukan milik user ini
 */
router.get('/:id', globalLimiter, getFlightBooking);

/**
 * @swagger
 * /api/flight-bookings/{id}/tickets:
 *   get:
 *     summary: List ringan seluruh tiket dalam booking ini
 *     description: >
 *       Untuk ditampilkan sebagai daftar (ditekan satu-satu untuk lihat
 *       detail lengkap). Cuma bisa diakses kalau booking sudah dibayar.
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
 *         description: booking_code, tickets (id, ticket_code, full_name, flight_type, seat_number, jadwal ringkas)
 *       403:
 *         description: Booking belum dibayar
 *       404:
 *         description: Tidak ditemukan atau bukan milik user ini
 */
router.get('/:id/tickets', globalLimiter, listFlightTickets);

/**
 * @swagger
 * /api/flight-bookings/{id}/tickets/{ticketId}:
 *   get:
 *     summary: Detail lengkap satu tiket, termasuk QR
 *     description: >
 *       Dibuka saat satu tiket dari list ditekan. Berisi jadwal penuh,
 *       origin/destination, kursi (kalau sudah dipilih), dan QR untuk
 *       ditunjukkan/discan.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail tiket lengkap + qr_code_url
 *       403:
 *         description: Booking belum dibayar
 *       404:
 *         description: Booking atau tiket tidak ditemukan
 */
router.get('/:id/tickets/:ticketId', globalLimiter, getFlightTicketDetail);

/**
 * @swagger
 * /api/flight-bookings/{id}/tickets/{ticketId}/seat:
 *   post:
 *     summary: Pilih atau ganti kursi untuk satu tiket
 *     description: >
 *       Kursi dicek unik per penerbangan (satu kursi cuma bisa dipegang
 *       satu tiket). Memanggil ulang untuk tiket yang sama dengan nomor
 *       berbeda akan melepas kursi lama lebih dulu, baru mencoba klaim
 *       yang baru -- kalau kursi barunya ternyata sudah kepakai, kursi
 *       lama TETAP terlepas (tidak otomatis kembali).
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seat_number]
 *             properties:
 *               seat_number: { type: string, example: "12A" }
 *     responses:
 *       201:
 *         description: Kursi berhasil diklaim
 *       400:
 *         description: seat_number tidak diisi
 *       404:
 *         description: Tiket tidak ditemukan atau bukan milik user ini
 *       409:
 *         description: Kursi sudah dipakai tiket lain, atau booking sudah tidak aktif
 */
router.post('/:id/tickets/:ticketId/seat', moderateLimiter, claimFlightSeat);

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
 *     description: >
 *       Mengembalikan available_seats sesuai jumlah penumpang, dan
 *       melepas kursi spesifik (flight_seats) yang sempat diklaim
 *       untuk tiket-tiket booking ini.
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