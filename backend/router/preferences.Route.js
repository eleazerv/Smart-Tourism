import express from "express";
import { getPreferences, updatePreferences } from "../controllers/preferences.Controller.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { globalLimiter } from "../middleware/RateLimit.js";
const router = express.Router();

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Ambil tag preferensi user yang login
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar tag yang dipilih user
 *       401:
 *         description: Tidak ada/invalid token
 *   put:
 *     summary: Replace seluruh preferensi user (bukan append)
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Preferensi berhasil di-replace, balikin daftar tag terbaru
 *       400:
 *         description: tag_ids bukan array
 */
router.get("/", authMiddleware, globalLimiter, getPreferences);
router.put("/", authMiddleware, globalLimiter, updatePreferences);

export default router;