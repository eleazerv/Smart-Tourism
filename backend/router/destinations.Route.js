import express from "express";
import { getDestinations, getDestinationById , getTrendingDestinations , postView} from '../controllers/destinations.Controller.js'
import { globalLimiter } from "../middleware/RateLimit.js";
import { dedupView } from "../middleware/Dedup.js";
import { optionalAuth } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.get("/",globalLimiter, getDestinations);
router.get("/trending",globalLimiter, getTrendingDestinations);
router.get("/:id",globalLimiter, getDestinationById);
router.post("/:id/view",globalLimiter, optionalAuth, dedupView, postView);
export default router;
