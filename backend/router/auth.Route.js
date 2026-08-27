import express from 'express';
import { getMe, updateMe } from '../controllers/auth.Controller.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js'
const router = express.Router();

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Profil user yang sedang login
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data user { id, email, full_name, avatar_url, role, created_at }
 *       401:
 *         description: Tidak ada/invalid token
 *       404:
 *         description: Profil tidak ditemukan
 */
router.get('/me', authMiddleware, getMe);

/**
 * @swagger
 * /api/auth/me:
 *   patch:
 *     summary: Ubah nama tampilan user yang sedang login
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name]
 *             properties:
 *               full_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 60
 *     responses:
 *       200:
 *         description: Data user setelah diperbarui { id, email, full_name, avatar_url, role, created_at }
 *       400:
 *         description: full_name kosong/terlalu panjang
 *       401:
 *         description: Tidak ada/invalid token
 *       404:
 *         description: Profil tidak ditemukan
 */
router.patch('/me', authMiddleware, updateMe);

export default router;