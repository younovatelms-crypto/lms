// src/server.js
// Younovate LMS — Main Express + Socket.io server
'use strict';

const path = require('path');
const os   = require('os');                         // ← ADDED (was missing → crash on os.homedir())
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('express-async-errors');

const express      = require('express');
const http         = require('http');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const connectDB      = require('./config/database');
const { initSocket } = require('./services/socketService');
const errorHandler   = require('./middleware/errorHandler');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const trainerRoutes      = require('./routes/trainerRoutes');
const traineeRoutes      = require('./routes/traineeRoutes');
const hrRoutes           = require('./routes/hrRoutes');
const sessionRoutes      = require('./routes/sessionRoutes');
const attendanceRoutes   = require('./routes/attendanceRoutes');
const assignmentRoutes   = require('./routes/assignmentRoutes');
const batchRoutes        = require('./routes/batchRoutes');
const batches        = require('./routes/batches');
const userRoutes         = require('./routes/userRoutes');
const courseRoutes       = require('./routes/courseRoutes');
const subjectContentRoutes = require('./routes/subjectContentRoutes');
const subscriptionRoutes = require('./routes/courseSubscriptionRoutes');
const livekitWebhook     = require('./routes/livekitWebhook');
const sessionCtrl        = require('./controllers/sessionController');

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

// ── Database + Socket ─────────────────────────────────────────────────────────
connectDB();
initSocket(server);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// ════════════════════════════════════════════════════════════════════════════
// LIVEKIT WEBHOOK — MUST be mounted BEFORE express.json(), with the raw parser.
// Signature verification needs the unparsed body.
// ════════════════════════════════════════════════════════════════════════════
app.use('/api/livekit', express.raw({ type: 'application/webhook+json' }), livekitWebhook);





// ── Rate limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

app.use(globalLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static file serving ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// local LiveKit recordings (same folder you mount into the egress container)
app.use('/recordings', express.static(path.join(os.homedir(), 'lms-recordings')));

// ── HTTP logging (dev only) ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({
    success:   true,
    status:    'ok',
    version:   '3.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  })
);

// ── LiveKit token (needs JSON body, so AFTER express.json) ─────────────────────
app.post('/api/livekit/token', /* authMiddleware, */ sessionCtrl.getToken);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/trainer',        trainerRoutes);
app.use('/api/trainee',        traineeRoutes);
app.use('/api/hr',             hrRoutes);
app.use('/api/sessions',       sessionRoutes);
app.use('/api/attendance',     attendanceRoutes);
app.use('/api/assignments',    assignmentRoutes);
app.use('/api/batches',        batchRoutes);
app.use('/api/batches/assign',        batches);
app.use('/api/users',          userRoutes);
app.use('/api/courses',        courseRoutes);
app.use('/api/courses_subject', subjectContentRoutes);
app.use('/api/subscriptions',  subscriptionRoutes);


// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`\n🚀  Younovate LMS API running on :${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server };