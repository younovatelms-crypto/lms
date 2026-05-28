// src/routes/sessionRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const { generateLiveKitToken } = require('../services/livekitService');
const { emitToRole } = require('../services/socketService');
const { protect, authorize } = require('../middleware/auth');

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
//   Response: { success, token (LiveKit JWT), roomName }
router.post('/:id/start', authorize('trainer'), async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.trainerId.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'This is not your session' });

  const roomName = `session-${session._id}`;
  const token    = await generateLiveKitToken(req.user, roomName, 'publisher');

  session.status    = 'live';
  session.roomName  = roomName;
  session.startedAt = new Date();
  await session.save();

  emitToRole('trainee', 'session:status', { id: session._id, status: 'live', roomName });
  return res.json({ success: true, token, roomName });
});

// POST /api/sessions/:id/join  [trainee]
//   Response: { success, token (LiveKit JWT), roomName }
router.post('/:id/join', authorize('trainee'), async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'live')
    return res.status(400).json({ success: false, message: 'Session is not live yet' });
  const token = await generateLiveKitToken(req.user, session.roomName, 'subscriber');
  return res.json({ success: true, token, roomName: session.roomName });
});

// POST /api/sessions/:id/end  [trainer]
router.post('/:id/end', authorize('trainer'), async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  session.status  = 'completed';
  session.endedAt = new Date();
  if (req.body.recordingUrl) session.recordingUrl = req.body.recordingUrl;
  await session.save();
  emitToRole('trainee', 'session:status', { id: session._id, status: 'completed' });
  return res.json({ success: true, message: 'Session ended', session });
});

module.exports = router;
