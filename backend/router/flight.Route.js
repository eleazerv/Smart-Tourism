import express from "express";
import { getFlightsCalendar, getFlightsByDate, getFlightById } from "../controllers/flights.Controller.js";
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

export default router;