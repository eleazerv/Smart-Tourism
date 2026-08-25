import express from 'express'; 
import swaggerUi from 'swagger-ui-express';
import {swaggerSpec } from './swagger.js'
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './router/auth.Route.js';
import heatmapRoutes from './router/heatmap.Route.js';
import tagsRoutes from './router/tags.Route.js';
import preferencesRouter from './router/preferences.Route.js';
import destinationsRouter from './router/destinations.Route.js';
import eventRouter from './router/events.Route.js';
import reccommendationRouter from './router/recommendations.Route.js';
import budgetRouter from './router/budget.Route.js';
import accommodationRouter from './router/accommodation.Route.js';
import flightRouter from './router/flight.Route.js';
import flightBookingsRouter from './router/flightbooking.Route.js';
import accommodationBookingsRouter from './router/accomodationBooking.Route.js';
import webhooksRouter from './router/webhook.Route.js';



const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.use(cors({
  origin: "[https:/localhost:3000]",
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
app.use("/api/accommodations",accommodationRouter)
app.use("/api/budget",budgetRouter)
app.use("/api/flights",flightRouter)
app.use("/api/flight-bookings", flightBookingsRouter);
app.use("/api/accommodation-bookings", accommodationBookingsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express backend!' });
});


app.use((err, req, res, next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'server_error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});