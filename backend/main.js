import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import {swaggerSpec } from './swagger.js'
import helmet from 'helmet';
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
import savedDestinationsRouter from './router/saved-destinations.Route.js';
import albumsRouter from './router/albums.Route.js';
import { sweepOverdueBookings } from './lib/bookingPayment.js';
import chatRouter from './router/chat.Route.js';
import cityRouter from './router/cities.Route.js';
import tripRouter from './router/trip.Route.js';
import tripBookingRoutes from './router/tripbooking.Route.js';
import routeRouter from './router/Route.Route.js';


const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// The browser only ever hits the API directly for authenticated calls (the
// save/wishlist toggle), and the Authorization header on those makes every
// request non-simple — so without CORS the preflight fails and the fetch
// rejects silently. Allowed origins come from CORS_ORIGINS (comma-separated),
// defaulting to the local Next dev server.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());

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
app.use("/api/saved-destinations", savedDestinationsRouter);
app.use("/api/albums", albumsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/cities", cityRouter);
app.use("/api/trips", tripRouter);
app.use("/api/route", routeRouter);
app.use('/api/trip-bookings', tripBookingRoutes);
app.use("/api/public-config", (req, res) => res.json({ supabase_url: process.env.SUPABASE_URL, supabase_anon_key: process.env.SUPABASE_ANON_KEY }));
// Swagger UI memuat script dan style inline, yang diblokir CSP bawaan helmet.
// Longgarkan kebijakannya di path ini saja, bukan di seluruh aplikasi.
// app.use(
//   '/api-docs',
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         ...helmet.contentSecurityPolicy.getDefaultDirectives(),
//         'script-src': ["'self'", "'unsafe-inline'"],
//         'style-src': ["'self'", "'unsafe-inline'"],
//       },
//     },
//   }),
//   swaggerUi.serve,
//   swaggerUi.setup(swaggerSpec),
// );

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
// Tenggat pembayaran ditegakkan oleh jam, bukan oleh webhook Xendit saja.
// Booking yang ditinggalkan pembelinya tidak akan pernah dibuka lagi, jadi
// tanpa sapuan berkala kursinya tertahan selamanya.
const SWEEP_INTERVAL_MS = Number(process.env.BOOKING_SWEEP_INTERVAL_MS || 5 * 60 * 1000);

function sweepBookings () {
  sweepOverdueBookings().catch((err) => {
    console.error('[sweepOverdueBookings] error', err);
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (SWEEP_INTERVAL_MS > 0) {
    sweepBookings();
    // unref supaya timer ini tidak ikut menahan proses saat server ditutup.
    setInterval(sweepBookings, SWEEP_INTERVAL_MS).unref();
  }
});