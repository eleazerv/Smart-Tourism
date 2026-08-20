import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './router/auth.Route.js';
import heatmapRoutes from './router/heatmap.Route.js';
import tagsRoutes from './router/tags.Route.js';
import preferencesRouter from './router/preferences.Route.js';
import destinationsRouter from './router/destinations.Route.js';
import eventRouter from './router/events.Route.js';
import reccommendationRouter from './router/recommendations.Route.js';
const app = express();
app.use(express.json());

app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use("/api/auth", authRoutes);
app.use("/api/heatmap", heatmapRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/preferences",preferencesRouter);
app.use("/api/destinations",destinationsRouter)
app.use("/api/events",eventRouter)
app.use("/api/recommendations",reccommendationRouter)
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express backend!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});