require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const violationRoutes = require('./routes/violations');
const reviewRoutes = require('./routes/reviews');
const connectDB = require('./config/db');
const { isEmailConfigured } = require('./utils/emailService');

const app = express();

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// One reverse proxy (e.g. Render) — required so express-rate-limit honors X-Forwarded-For
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser tools (no Origin) and configured frontend URLs
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Vite may use 5174+ when 5173 is taken — allow any local dev port in development
    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

const isDev = process.env.NODE_ENV !== 'production';

// Development: effectively disable rate limiting so polling/chat won't lock you out.
// Production: keep a reasonable safety limit.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: () => isDev && process.env.DISABLE_RATE_LIMIT === 'true',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/change-password', authLimiter);

const uploadPath = process.env.UPLOAD_PATH || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, uploadPath)));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Beacon API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`ReclaimIt server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`Email notifications: ${isEmailConfigured() ? 'enabled' : 'disabled (set EMAIL + EMAIL_PASSWORD)'}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env`);
      console.error('To find the process: netstat -ano | findstr :5000');
      process.exit(1);
    }
    throw err;
  });
});

module.exports = app;
