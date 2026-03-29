// Main entry point for the backend application
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Scraper scheduling (imported for side-effect: starts cron jobs)
const { scheduleScraper } = require('./scraper');

// Shared resource pools
const { pool, testConnection, closePool } = require('./db');
const { closeBrowser } = require('./browserPool');

// Rate limiters
const { generalLimiter } = require('./middleware/rateLimiter');

// Route modules
const authRoutes = require('./routes/auth');
const sourcesRoutes = require('./routes/sources');
const articlesRoutes = require('./routes/articles');
const scrapingRoutes = require('./routes/scraping');
const sundayEditionsRoutes = require('./routes/sundayEditions');
const { statsRouter: statsRoutes, aiServiceRouter: aiServiceRoutes } = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const rssRoutes = require('./routes/rss');

const app = express();
const port = process.env.PORT || 3000;

// ============================================================================
// CORS
// ============================================================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4321'];

if (process.env.NODE_ENV === 'production') {
  allowedOrigins.forEach(origin => {
    if (!origin.startsWith('https://')) {
      console.error(`[FATAL] CORS origin must use HTTPS in production: ${origin}`);
      process.exit(1);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[WARN] CORS blocked origin: ${origin}`);
      callback(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true,
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
}));

// ============================================================================
// SECURITY & PARSING
// ============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

app.use(cookieParser());
app.use(generalLimiter);
app.use(express.json());

// ============================================================================
// REQUEST LOGGING
// ============================================================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  let logMessage = `[INFO] ${timestamp} - ${method} ${url} from ${ip}`;

  if (['POST', 'PUT'].includes(method) && req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password !== undefined)    safeBody.password    = '[REDACTED]';
    if (safeBody.newPassword !== undefined) safeBody.newPassword = '[REDACTED]';
    if (safeBody.oldPassword !== undefined) safeBody.oldPassword = '[REDACTED]';
    logMessage += ` - Body: ${JSON.stringify(safeBody)}`;
  }

  console.log(logMessage);
  next();
});

// ============================================================================
// DATABASE
// ============================================================================
testConnection();

// ============================================================================
// ROUTES
// ============================================================================

// Auth: /api/register, /api/login, /api/logout, /api/refresh, /api/me
app.use('/api', authRoutes);

// Sources: /api/sources, /api/sources/:id, /api/sources/:id/articles, etc.
app.use('/api/sources', sourcesRoutes);

// Articles: /api/articles, /api/articles/:id, /api/articles/:id/block, etc.
app.use('/api/articles', articlesRoutes);

// Scraping, topics, AI processing: /api/topics, /api/scrape/run, /api/process-missing-ai, /api/discover-sources
app.use('/api', scrapingRoutes);

// Sunday Editions: /api/sunday-editions, /api/sunday-editions/:id, etc.
app.use('/api/sunday-editions', sundayEditionsRoutes);

// Webhook: /api/unreal-speech-callback (kept at top-level /api for backward compat)
app.post('/api/unreal-speech-callback', (req, res, next) => {
  req.url = '/unreal-speech-callback';
  sundayEditionsRoutes(req, res, next);
});

// Stats: /api/stats
app.use('/api/stats', statsRoutes);

// AI Service: /api/ai-service/stats, /api/ai-service/clear-cache
app.use('/api/ai-service', aiServiceRoutes);

// Settings: /api/settings/scheduler
app.use('/api/settings', settingsRoutes);

// RSS: /api/rss
app.use('/api/rss', rssRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - Unhandled error:`, err);
  if (res.headersSent) {
    return next(err);
  }
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({ error: 'Internal Server Error', ...(isDev && { details: err.message }) });
});

// ============================================================================
// SERVER START
// ============================================================================
app.listen(port, () => {
  console.log(`[INFO] ${new Date().toISOString()} - Backend server listening on port ${port}`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
const shutdown = async (signal) => {
  console.log(`[INFO] ${new Date().toISOString()} - Received ${signal}. Starting graceful shutdown...`);
  try {
    await closeBrowser();
    console.log(`[INFO] ${new Date().toISOString()} - Browser pool closed.`);
    await closePool();
    console.log(`[INFO] ${new Date().toISOString()} - Database pool closed.`);
    console.log(`[INFO] ${new Date().toISOString()} - Graceful shutdown complete.`);
    process.exit(0);
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - Error during graceful shutdown:`, error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error(`[ERROR] ${new Date().toISOString()} - Uncaught Exception:`, error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[ERROR] ${new Date().toISOString()} - Unhandled Rejection at:`, promise, 'reason:', reason);
});

module.exports = { pool };
