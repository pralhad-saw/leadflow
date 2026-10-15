require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const attachSocket = require('./socket');

const app = express();

// Render / Vercel sit behind a proxy -> needed for correct client IPs (rate limiting)
app.set('trust proxy', 1);

app.use(helmet());

// Explicit allow-list instead of cors() with no options.
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl / Postman / server-to-server
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

app.get('/', (req, res) => res.send('LeadFlow API running'));
app.get('/api/health', (req, res) =>
  res.json({ ok: true, uptime: Math.round(process.uptime()), env: process.env.NODE_ENV || 'development' })
);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/brokerages', require('./routes/brokerageRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  const io = attachSocket(server, allowedOrigins);
  app.set('io', io);

  const shutdown = (signal) => () => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
});

module.exports = app;
