import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { pool } from './helpers/db.js';
import { setCorsHeaders } from './middleware/cors.js';
import { authRoutes } from './routes/auth.js';
import { lookupRoutes } from './routes/lookups.js';
import { locationRoutes } from './routes/location.js';
import { reportRoutes } from './routes/reports.js';
import { commentRoutes } from './routes/comments.js';
import { flagRoutes } from './routes/flags.js';
import { userRoutes } from './routes/users.js';
import { adminRoutes } from './routes/admin.js';
import { moderationRoutes } from './routes/moderation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'pending');
fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(setCorsHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400 * 1000,
    httpOnly: true,
    secure: config.appEnv === 'production',
    sameSite: 'lax',
  },
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', lookupRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);

// Static files (HTML, CSS, JS) from public/
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ success: false, error: 'Not found', code: 404 });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const server = app.listen(config.port, () => {
  console.log(`OpenSafetyMap running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  server.close();
  await pool.end();
  process.exit(0);
});

export { app };
