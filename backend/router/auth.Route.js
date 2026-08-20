import express from 'express';
import { getMe } from '../controllers/auth.Controller.js';
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

export default router;