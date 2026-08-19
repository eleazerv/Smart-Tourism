import express from "express";
import { getTags } from "../controllers/tags.Controller.js";
import { globalLimiter } from "../middleware/RateLimit.js";
const router = express.Router();

router.get("/",globalLimiter, getTags);

export default router;