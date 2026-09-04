import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import {
  listAlbums,
  createAlbum,
  getAlbum,
  updateAlbum,
  deleteAlbum,
} from '../controllers/albums.Controller.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/albums:
 *   get:
 *     summary: Daftar album milik user, terbaru dulu
 *     description: >
 *       Setiap album membawa item_count. Kalau query destination_id diisi,
 *       tiap album juga membawa `contains` -- dipakai pemilih album untuk
 *       mencentang kotak yang benar tanpa mengambil isi seluruh album.
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destination_id
 *         required: false
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Maksimal 100 album
 *   post:
 *     summary: Buat album baru
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 60 }
 *     responses:
 *       201:
 *         description: Album dibuat
 *       400:
 *         description: Nama kosong atau lebih dari 60 karakter
 *       409:
 *         description: Nama album sudah dipakai user ini
 */
router.get('/', globalLimiter, listAlbums);
router.post('/', moderateLimiter, createAlbum);

/**
 * @swagger
 * /api/albums/{id}:
 *   get:
 *     summary: Satu album beserta destinasi di dalamnya
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Album dan maksimal 200 destinasi, terbaru dulu
 *       404:
 *         description: Album tidak ada atau bukan milik user ini
 *   patch:
 *     summary: Ganti nama album
 *     tags: [Albums]
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
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 60 }
 *     responses:
 *       200:
 *         description: Nama diperbarui
 *       404:
 *         description: Album tidak ditemukan
 *       409:
 *         description: Nama album sudah dipakai
 *   delete:
 *     summary: Hapus album
 *     description: >
 *       Isinya ikut terhapus, tapi destinasinya tetap tersimpan. Membubarkan
 *       album bukan membatalkan simpan.
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Album dihapus
 *       404:
 *         description: Album tidak ditemukan
 */
router.get('/:id', globalLimiter, getAlbum);
router.patch('/:id', moderateLimiter, updateAlbum);
router.delete('/:id', moderateLimiter, deleteAlbum);

export default router;
