import express from "express";
import { getEventById, getEvents } from "../controllers/events.Controller.js";
import { globalLimiter } from "../middleware/RateLimit.js";
 
const router = express.Router();
 
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List acara/event
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: province_id
 *         schema: { type: integer }
 *       - in: query
 *         name: city_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Daftar event
 *       400:
 *         description: month di luar rentang 1-12
 */
router.get("/", globalLimiter, getEvents)
 
/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Detail satu event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail event
 *       404:
 *         description: Event tidak ditemukan
 */
router.get("/:id", globalLimiter, getEventById)
 
export default router;
 
