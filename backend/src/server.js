// src/server.js
const path = require('path');
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

const authRoutes       = require('./routes/authRoutes');
const sessionRoutes    = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const trainerRoutes    = require('./routes/trainerRoutes');
const traineeRoutes    = require('./routes/traineeRoutes');
const hrRoutes         = require('./routes/hrRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

connectDB();
initSocket(server);

app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/api/health', (req, res) =>
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
);

//app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/auth',         authRoutes);
app.use('/api/sessions',    sessionRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/trainer',     trainerRoutes);
app.use('/api/trainee',     traineeRoutes);
app.use('/api/hr',          hrRoutes);
app.use('/api/assignments', assignmentRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`\n🚀 Younovate LMS API running on port ${PORT}\n🌍 ${process.env.NODE_ENV || 'development'}\n`)
);

module.exports = { app, server };