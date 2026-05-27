// src/routes/sessionRoutes.js
const express = require('express');
const {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  joinSession,
  endSession,
} = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getSessions);
router.get('/:id', getSessionById);
router.post('/', authorize('admin'), createSession);
router.put('/:id', authorize('admin'), updateSession);
router.delete('/:id', authorize('admin'), deleteSession);
router.post('/:id/start', authorize('trainer'), startSession);
router.post('/:id/join', authorize('trainee'), joinSession);
router.post('/:id/end', authorize('trainer'), endSession);

module.exports = router;


// src/routes/attendanceRoutes.js (inline for brevity)
const express2 = require('express');
const { authenticate: auth, authorize: authz } = require('../middleware/auth');

const r2 = express2.Router();
r2.use(auth);

// Placeholder controllers — implement like sessionController pattern
r2.get('/session/:id', async (req, res) => {
  const Attendance = require('../models/Attendance');
  const records = await Attendance.find({ sessionId: req.params.id })
    .populate('traineeId', 'name email avatar');
  res.json({ success: true, records });
});

r2.post('/mark', authz('trainer'), async (req, res) => {
  const Attendance = require('../models/Attendance');
  const { emitToSession } = require('../services/socketService');
  const { sessionId, traineeId, status, notes } = req.body;

  const record = await Attendance.findOneAndUpdate(
    { sessionId, traineeId },
    { status, notes, markedBy: req.user._id },
    { upsert: true, new: true }
  );

  // Real-time push to all in the session room
  emitToSession(sessionId, 'attendance:update', { sessionId, record });

  res.json({ success: true, record });
});

r2.get('/trainee/:id', async (req, res) => {
  const Attendance = require('../models/Attendance');
  const records = await Attendance.find({ traineeId: req.params.id })
    .populate('sessionId', 'title scheduledAt')
    .sort('-createdAt');
  res.json({ success: true, records });
});

r2.get('/batch/:id', async (req, res) => {
  const Attendance = require('../models/Attendance');
  const records = await Attendance.find({ batchId: req.params.id });
  res.json({ success: true, records });
});

module.exports = r2;
