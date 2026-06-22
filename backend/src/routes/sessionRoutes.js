// src/routes/sessionRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const { generateLiveKitToken } = require('../services/livekitService');
const { emitToRole } = require('../services/socketService');
const { protect, authorize } = require('../middleware/auth');
const sessionCtrl = require('../controllers/sessionController');

const router = express.Router();
router.use(protect);

// GET /api/sessions?status=&batchId=&page=1&limit=50
router.get('/', async (req, res) => {
  const { status, batchId, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (req.user.role === 'trainer') filter.trainerId = req.user._id;
  if (req.user.role === 'trainee') filter.batchId   = req.user.batchId;
  if (status)  filter.status  = status;
  if (batchId) filter.batchId = batchId;

  const total    = await Session.countDocuments(filter);
  const sessions = await Session.find(filter)
    .populate('trainerId', 'name profilePicture')
    .populate('batchId',   'name')
    .sort({ scheduledAt: -1 })
    .limit(Number(limit)).skip((Number(page) - 1) * Number(limit));

  return res.json({ success: true, sessions, total, page: Number(page) });
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('trainerId', 'name email profilePicture')
    .populate('batchId',   'name');
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  return res.json({ success: true, session });
});

// POST /api/sessions  [admin only]
//   Body: { title, batchId, trainerId, scheduledAt, durationMinutes?, description?, topics?, resources? }
router.post('/', authorize('admin'), async (req, res) => {
  const { title, batchId, trainerId, scheduledAt } = req.body;
  if (!title || !batchId || !trainerId || !scheduledAt)
    return res.status(400).json({ success: false, message: 'title, batchId, trainerId, scheduledAt required' });
  const session = await Session.create(req.body);
  await session.populate('trainerId', 'name');
  emitToRole('trainer', 'notification', { type: 'info', message: `New session scheduled: ${session.title}` });
  return res.status(201).json({ success: true, session });
});

// PUT /api/sessions/:id  [admin]
//   Body: any session fields
router.put('/:id', authorize('admin'), async (req, res) => {
  const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('trainerId', 'name');
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  return res.json({ success: true, session });
});

// DELETE /api/sessions/:id  [admin]
router.delete('/:id', authorize('admin'), async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  return res.json({ success: true, message: 'Session deleted' });
});

// POST /api/sessions/:id/start  [trainer]
// Delegates to the shared goLive controller so the room name, recording (egress)
// and trainee notifications all use the SAME canonical room ("session_<id>") as
// the trainee join path. (Previously this minted a "session-<id>" room with a
// broken token call, leaving the trainer alone in a room no trainee could reach.)
router.post('/:id/start', authorize('trainer'), sessionCtrl.goLive);

// POST /api/sessions/:id/join  [trainee]
// Delegates to the shared joinSession controller (canonical room + enrollment/
// passcode checks). Previously used the persisted session.roomName, which could
// be a stale "session-<id>" value that did not match the trainer's room.
router.post('/:id/join', authorize('trainee'), sessionCtrl.joinSession);

// POST /api/sessions/:id/end  [trainer]
// Delegates to endSession so LiveKit egress (recording) is stopped and the
// recording webhook can finalise the file.
router.post('/:id/end', authorize('trainer'), sessionCtrl.endSession);

module.exports = router;
