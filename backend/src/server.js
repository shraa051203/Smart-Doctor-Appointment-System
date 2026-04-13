import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

config({ path: envPath });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import appointmentRoutes from './routes/appointments.js';

// Debug logs
console.log('Current working directory:', process.cwd());
console.log('Env file path:', envPath);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

validateEnv();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === 'production';


// ✅ Allowed origins (IMPORTANT: no trailing slash)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://appointment-front-end-woad.vercel.app'
].filter(Boolean);


// ✅ Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);


// ✅ FIXED CORS (dynamic origin check)
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


// ✅ Body parser
app.use(express.json({ limit: '1mb' }));


// ✅ Health route
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: isProd ? 'production' : 'development' });
});


// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);


// ❌ 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));


// ❌ Error handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err);

  const status =
    Number(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  const safeMessage =
    err && typeof err.message === 'string' && err.message.trim()
      ? err.message.trim()
      : null;

  const message =
    isProd && status === 500
      ? 'Internal server error'
      : safeMessage || 'Internal server error';

  res.status(status).json({ message });
});


// ✅ Connect DB & start server
await connectDB();

const server = app.listen(PORT, () => {
  console.log(
    `Server listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`
  );
});


// ✅ Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received, closing…`);

  server.close(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
