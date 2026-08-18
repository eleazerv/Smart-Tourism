import express from 'express';
import { getMe } from '../controllers/auth.Controller.js';
import {authMiddleware} from '../middleware/AuthMiddleware.js'
const router = express.Router();

router.get('/me',authMiddleware,getMe);

export default router;