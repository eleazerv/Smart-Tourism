import express from "express";
import { getPreferences, updatePreferences } from "../controllers/preferences.Controller.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { globalLimiter } from "../middleware/RateLimit.js";
const router = express.Router();

router.get("/", authMiddleware, globalLimiter, getPreferences);
router.put("/", authMiddleware, globalLimiter, updatePreferences);

export default router;