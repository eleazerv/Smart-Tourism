import express from 'express' ; 
import { globalLimiter } from "../middleware/RateLimit.js";
import { getForYou, getRecommendations } from '../controllers/recommendations.Controller.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';

const router = express.Router();

router.get("/",globalLimiter, getRecommendations);
router.get("/for-you",authMiddleware,globalLimiter, getForYou);

export default router ; 