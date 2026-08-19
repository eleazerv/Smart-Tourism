import express from "express";
import { getEventById, getEvents } from "../controllers/events.Controller.js";
import { globalLimiter } from "../middleware/RateLimit.js";

const router = express.Router();

router.get("/", globalLimiter,getEvents )
router.get("/:id",globalLimiter,getEventById )
export default router;