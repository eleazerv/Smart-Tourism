import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import {
  listAlbums,
  createAlbum,
  getAlbum,
  updateAlbum,
  deleteAlbum,
  shareAlbum,
  unshareAlbum,
  getSharedAlbum,
} from '../controllers/albums.Controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/albums/shared/{token}:
 *   get:
 *     summary: Album yang dibagikan, tanpa perlu login
 *     description: >
 *       Hanya album yang punya share_token yang terbaca; mencabut tautan
 *       membuat token lama langsung 404. Tidak mengembalikan identitas
 *       pemilik.
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Album beserta destinasinya
 *       404:
 *         description: Tautan tidak dikenal atau sudah dicabut
 */
// Didaftarkan SEBELUM router.use(authMiddleware): ini satu-satunya rute
// album yang boleh diakses tanpa token.
router.get('/shared/:token', globalLimiter, getSharedAlbum);

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

/**
 * @swagger
 * /api/albums/{id}/share:
 *   post:
 *     summary: Nyalakan tautan publik untuk album ini
 *     description: >
 *       Idempoten -- album yang sudah dibagikan mengembalikan token yang
 *       sama, jadi menekan Bagikan dua kali tidak mematikan tautan yang
 *       sudah tersebar.
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
 *         description: Album sudah dibagikan sebelumnya, token lama dipakai
 *       201:
 *         description: Tautan baru dibuat
 *       404:
 *         description: Album tidak ditemukan
 *   delete:
 *     summary: Cabut tautan publik
 *     description: >
 *       Token lama tidak disimpan, jadi berbagi lagi nanti menghasilkan
 *       tautan baru dan yang terlanjur tersebar tetap mati.
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
 *         description: Tautan dicabut
 *       404:
 *         description: Album tidak ditemukan
 */
router.post('/:id/share', moderateLimiter, shareAlbum);
router.delete('/:id/share', moderateLimiter, unshareAlbum);

export default router;
