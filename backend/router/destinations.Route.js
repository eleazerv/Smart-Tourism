import express from "express";
import { getDestinations, getDestinationById , getTrendingDestinations , postView} from '../controllers/destinations.Controller.js'
import { globalLimiter } from "../middleware/RateLimit.js";
import { dedupView } from "../middleware/Dedup.js";
import { optionalAuth } from "../middleware/AuthMiddleware.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { moderateLimiter } from "../middleware/RateLimit.js";
import { handleReviewPhotoUpload } from "../middleware/HandleReviewPhoto.js";
import { getReviews, createReview, deleteReview, likeReview } from "../controllers/reviews.Controller.js";
const router = express.Router();

router.get("/",globalLimiter, getDestinations);
router.get("/trending",globalLimiter, getTrendingDestinations);
router.get("/:id",globalLimiter, getDestinationById);
router.post("/:id/view",globalLimiter, optionalAuth, dedupView, postView);

router.get('/:id/reviews', globalLimiter, optionalAuth, getReviews);
router.post('/:id/reviews', authMiddleware, moderateLimiter, handleReviewPhotoUpload, createReview);

router.delete('/reviews/:id', authMiddleware, moderateLimiter, deleteReview);
router.post('/reviews/:id/like', authMiddleware, moderateLimiter, likeReview);

export default router;
