import express from "express";
import { globalLimiter } from "../middleware/RateLimit.js";
import {getHeatmap} from '../controllers/heatmap.Controller.js'
const router = express.Router();

router.get("/",globalLimiter,getHeatmap); 
export default router; 