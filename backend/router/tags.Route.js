import express from "express";
import { getTags } from "../controllers/tags.Controller.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { globalLimiter } from "../middleware/RateLimit.js";
const router = express.Router();

router.get("/",authMiddleware,globalLimiter, getTags);

export default router;