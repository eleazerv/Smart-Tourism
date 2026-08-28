import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import {
  getTripCanvas,
  patchTrip,
  addTripItem,
  patchTripItem,
  removeTripItem,
  reorderTripItems,
  setTripFlight,
  removeTripFlight,
} from '../controllers/trip.Controller.js';

const router = express.Router();

// Seluruh endpoint di sini mengubah rencana milik pengguna sendiri.
router.use(authMiddleware);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Ambil isi rencana (trip, destinasi, penerbangan)
 *     description: >
 *       Sama dengan canvas yang dikembalikan endpoint chat, tapi bisa dipanggil
 *       langsung tanpa melibatkan AI. Dipakai frontend untuk menggambar ulang
 *       panel rencana setelah pengguna mengubah sesuatu sendiri.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: trip, items, flights }
 *       404: { description: Rencana tidak ditemukan atau bukan milik Anda }
 *   patch:
 *     summary: Ubah info rencana (nama, tanggal, jumlah orang, kota asal)
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               travelers: { type: integer, minimum: 1 }
 *               origin_city_id: { type: integer }
 *     responses:
 *       200: { description: Rencana diperbarui }
 *       400: { description: Tanggal tidak valid }
 */
router.get('/:id', globalLimiter, getTripCanvas);
router.patch('/:id', moderateLimiter, patchTrip);

/**
 * @swagger
 * /api/trips/{id}/items:
 *   post:
 *     summary: Tambah destinasi ke rencana (dipilih sendiri oleh pengguna)
 *     description: >
 *       Item yang ditambahkan lewat endpoint ini ditandai added_by=user, supaya
 *       AI tahu bahwa pengguna yang memilihnya dan tidak menjelaskannya ulang
 *       seolah-olah itu usulannya sendiri.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destination_id]
 *             properties:
 *               destination_id: { type: string, format: uuid }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Destinasi ditambahkan }
 *       200: { description: Sudah ada di rencana, tidak diubah }
 *       404: { description: Destinasi tidak ditemukan }
 */
router.post('/:id/items', moderateLimiter, addTripItem);

/**
 * @swagger
 * /api/trips/{id}/items/order:
 *   put:
 *     summary: Ubah urutan kunjungan destinasi
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordered_item_ids]
 *             properties:
 *               ordered_item_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Urutan diperbarui }
 */
router.put('/:id/items/order', moderateLimiter, reorderTripItems);

/**
 * @swagger
 * /api/trips/{id}/items/{itemId}:
 *   patch:
 *     summary: Ubah satu item rencana (status, penginapan, tanggal, catatan)
 *     description: >
 *       Dipakai untuk checkbox konfirmasi, pemilihan penginapan, dan pengisian
 *       tanggal langsung dari panel — tanpa melalui AI, jadi tidak memakai token.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [suggested, confirmed] }
 *               accommodation_id: { type: string, format: uuid, nullable: true }
 *               check_in: { type: string, format: date, nullable: true }
 *               check_out: { type: string, format: date, nullable: true }
 *               guests: { type: integer, minimum: 1 }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Item diperbarui }
 *       400: { description: Tanggal tidak valid atau tamu melebihi kapasitas }
 *       409: { description: Item sudah dipesan, tidak bisa diubah }
 *   delete:
 *     summary: Keluarkan destinasi dari rencana
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Item dikeluarkan }
 *       409: { description: Item sudah dipesan }
 */
router.patch('/:id/items/:itemId', moderateLimiter, patchTripItem);
router.delete('/:id/items/:itemId', moderateLimiter, removeTripItem);

/**
 * @swagger
 * /api/trips/{id}/flights:
 *   put:
 *     summary: Pilih penerbangan berangkat atau pulang
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [flight_option_id, flight_type]
 *             properties:
 *               flight_option_id: { type: string, format: uuid }
 *               flight_type: { type: string, enum: [outbound, return] }
 *     responses:
 *       200: { description: Penerbangan dipilih }
 *       409: { description: Penerbangan sudah dipesan, tidak bisa diganti }
 */
router.put('/:id/flights', moderateLimiter, setTripFlight);

/**
 * @swagger
 * /api/trips/{id}/flights/{type}:
 *   delete:
 *     summary: Batalkan pilihan penerbangan (belum dipesan)
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [outbound, return] }
 *     responses:
 *       200: { description: Pilihan dihapus }
 *       409: { description: Sudah dipesan }
 */
router.delete('/:id/flights/:type', moderateLimiter, removeTripFlight);

export default router;