import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Rapido Backend Server with Socket.IO
dotenv.config();

import { registerRideSocketHandlers } from './sockets/rideSocket';
import { fareRouter } from './routes/fares';
import { rideRouter } from './routes/rides';
import { captainRouter } from './routes/captains';
import { paymentRouter } from './routes/payments';
import { promoRouter } from './routes/promos';
import { reviewRouter } from './routes/reviews';
import { userRouter } from './routes/users';
import { seedDatabase } from './prisma/seed';

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      return callback(null, true); // Allow any local dev origin
    },
    credentials: true,
  })
);

app.use(express.json());

// Attach Socket.IO
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

registerRideSocketHandlers(io);

// Root welcome and status page
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapido Backend & Real-Time Engine</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #18181B;
          color: #F4F4F5;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .card {
          background: #27272A;
          border: 1px solid #3F3F46;
          border-radius: 1.25rem;
          padding: 2.5rem;
          max-width: 580px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          background: #FFC72C;
          color: #000;
          font-weight: 900;
          font-size: 0.85rem;
          padding: 0.25rem 0.75rem;
          border-radius: 0.5rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        h1 { margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1.6rem; color: #FFFFFF; }
        p { color: #A1A1AA; font-size: 0.95rem; line-height: 1.5; }
        .btn-group { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
        .btn-primary {
          display: block;
          text-align: center;
          background: #FFC72C;
          color: #000;
          font-weight: 800;
          text-decoration: none;
          padding: 0.85rem 1.25rem;
          border-radius: 0.75rem;
          transition: background 0.2s;
        }
        .btn-primary:hover { background: #E5B224; }
        .btn-secondary {
          display: block;
          text-align: center;
          background: #3F3F46;
          color: #FFF;
          font-weight: 600;
          text-decoration: none;
          padding: 0.75rem 1.25rem;
          border-radius: 0.75rem;
          transition: background 0.2s;
        }
        .btn-secondary:hover { background: #52525B; }
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
          margin-right: 6px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">🛵 Rapido Backend API</div>
        <h1>Express & Socket.IO Server Online</h1>
        <p>
          <span class="status-dot"></span>You have reached the backend API & WebSockets server on <strong>port 5000</strong>.
        </p>
        <p>
          To access the full interactive user application (booking map, vehicle selector, and Captain console), open the <strong>Frontend on port 3000</strong>:
        </p>
        <div class="btn-group">
          <a class="btn-primary" href="http://localhost:3000">👉 Open Rider Web App (localhost:3000)</a>
          <a class="btn-secondary" href="http://localhost:3000/captain">🛵 Open Captain Dashboard (localhost:3000/captain)</a>
          <a class="btn-secondary" href="/health">🔍 View API Health Status (/health)</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Rapido Ride-Hailing Server',
    time: new Date().toISOString(),
  });
});

// Database debug and health inspection
app.get('/api/debug-db', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    const captainCount = await prisma.captainProfile.count();
    const promoCount = await prisma.promoCode.count();
    return res.json({
      status: 'connected',
      userCount,
      captainCount,
      promoCount,
      databaseUrlPrefix: (process.env.DATABASE_URL || '').substring(0, 15) + '...',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      code: err.code,
      meta: err.meta,
    });
  }
});

// Mount API routes
app.use('/api/fares', fareRouter);
app.use('/api/rides', rideRouter);
app.use('/api/captains', captainRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/promos', promoRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/users', userRouter);

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Rapido Server is running on 0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time events`);
  await seedDatabase(false);
});
