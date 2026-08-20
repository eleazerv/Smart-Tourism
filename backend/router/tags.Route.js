import express from "express";
import { getTags } from "../controllers/tags.Controller.js";
import { globalLimiter } from "../middleware/RateLimit.js";
const router = express.Router();

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Master list semua tag (publik)
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: Daftar tag { id, name, slug, description }
 */
router.get("/", globalLimiter, getTags);

export default router;