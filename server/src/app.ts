import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import destinationsRoutes from './routes/destinations.routes';
import tripOptionsRoutes from './routes/tripOptions.routes';
import bookingsRoutes from './routes/bookings.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Global middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'https://tripzy-gm79uib89-shreya-singhs-projects-702a36c1.vercel.app',
      process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === 'test' ? 'silent' : 'dev'));
app.use(express.json());
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/trip-options', tripOptionsRoutes);
app.use('/api/bookings', bookingsRoutes);

// ── Centralized error handler (must be last) ───────────────────────────────
app.use(errorHandler);

export default app;
