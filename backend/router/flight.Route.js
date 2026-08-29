import express from "express";
import { getFlightsCalendar, getFlightsByDate, searchFlightsByCode, getFlightById, getTakenSeats } from "../controllers/flights.Controller.js";
import { globalLimiter } from "../middleware/RateLimit.js";

const router = express.Router();

/**
 * @swagger
 * /api/flights/calendar:
 *   get:
 *     summary: Harga termurah per hari dalam satu bulan untuk suatu rute (kalender harga)
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: origin_city_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: destination_city_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-09" }
 *         description: Format YYYY-MM. Default bulan sekarang kalau tidak dikirim.
 *     responses:
 *       200:
 *         description: origin_city_id, destination_city_id, month, data (array {date, lowest_price})
 *       400:
 *         description: Query tidak valid
 */
router.get('/calendar', globalLimiter, getFlightsCalendar);

/**
 * @swagger
 * /api/flights:
 *   get:
 *     summary: List penerbangan pada satu tanggal + rute tertentu
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: origin_city_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: destination_city_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-09-15" }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price, departure_time], default: price }
 *     responses:
 *       200:
 *         description: origin_city_id, destination_city_id, date, data (array penerbangan)
 *       400:
 *         description: Query tidak valid
 */
router.get('/', globalLimiter, getFlightsByDate);

/**
 * @swagger
 * /api/flights/search:
 *   get:
 *     summary: Cari penerbangan berdasarkan kode (mis. dari yang tertera di tiket)
 *     description: >
 *       flight_number tidak unik di database -- nomor yang sama wajar
 *       terulang di hari berbeda. Sertakan date kalau tau tanggalnya
 *       (paling akurat); tanpa date, hasil dibatasi ke penerbangan yang
 *       belum berangkat, maksimal 20 baris terdekat.
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: flight_number
 *         required: true
 *         schema: { type: string, example: "JT-781" }
 *       - in: query
 *         name: date
 *         schema: { type: string, example: "2026-09-15" }
 *         description: Opsional. Format YYYY-MM-DD.
 *     responses:
 *       200:
 *         description: flight_number, date, count, data (array penerbangan)
 *       400:
 *         description: flight_number tidak diisi, atau date format salah
 *       404:
 *         description: Tidak ada penerbangan dengan kode itu
 */
router.get('/search', globalLimiter, searchFlightsByCode);

/**
 * @swagger
 * /api/flights/{id}:
 *   get:
 *     summary: Detail satu penerbangan
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail penerbangan lengkap dengan kota & provinsi asal/tujuan
 *       404:
 *         description: Penerbangan tidak ditemukan
 */
router.get('/:id', globalLimiter, getFlightById);

/**
 * @swagger
 * /api/flights/{id}/seats:
 *   get:
 *     summary: Nomor kursi yang sudah kepake di penerbangan ini
 *     description: >
 *       Cuma nomor kursinya, bukan punya siapa -- publik, tidak perlu
 *       login. Dipakai FE untuk menggambar peta kursi.
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: flight_id, taken_seats (array string)
 */
router.get('/:id/seats', globalLimiter, getTakenSeats);

export default router;