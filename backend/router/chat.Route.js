import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter, chatLimiter, chatDailyLimiter } from '../middleware/RateLimit.js';
import {
  createRoom,
  listRooms,
  getRoom,
  sendMessage,
} from '../controllers/Chat.Controller.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/chat/rooms:
 *   post:
 *     summary: Buat ruang percakapan baru beserta draft perjalanannya
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Ruang dibuat, sudah terhubung ke satu trip berstatus planning
 *   get:
 *     summary: Daftar ruang percakapan milik user
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maksimal 50 ruang, diurutkan dari yang terakhir dipakai
 */
router.post('/rooms', moderateLimiter, createRoom);
router.get('/rooms', globalLimiter, listRooms);

/**
 * @swagger
 * /api/chat/rooms/{id}:
 *   get:
 *     summary: Riwayat percakapan sekaligus isi canvas rencana perjalanan
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: room, messages, canvas
 *       404:
 *         description: Tidak ditemukan atau bukan milik user ini
 */
router.get('/rooms/:id', globalLimiter, getRoom);

/**
 * @swagger
 * /api/chat/rooms/{id}/messages:
 *   post:
 *     summary: Kirim pesan ke AI dan dapatkan jawaban beserta canvas terbaru
 *     description: >
 *       AI boleh memanggil tool untuk mencari destinasi, penginapan,
 *       penerbangan, memperkirakan waktu tempuh, dan mengubah isi rencana.
 *       Balasannya berisi jawaban teks, keadaan canvas setelah perubahan,
 *       dan daftar tool yang sempat dipakai.
 *     tags: [AI Chat]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 2000 }
 *     responses:
 *       200:
 *         description: answer, canvas, tools_used
 *       400:
 *         description: message kosong atau terlalu panjang
 *       502:
 *         description: Groq tidak bisa dihubungi
 */
// chatLimiter dipakai karena satu pesan bisa memicu beberapa panggilan
// ke deepseek sekaligus beberapa kueri database.
router.post('/rooms/:id/messages', chatLimiter,chatDailyLimiter, sendMessage);

export default router;