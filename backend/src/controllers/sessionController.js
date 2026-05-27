// src/controllers/sessionController.js
const Session = require('../models/Session');
const { generateLiveKitToken } = require('../services/livekitService');
const { emitToRole } = require('../services/socketService');

// GET /api/sessions
const getSessions = async (req, res) => {
  const { status, batchId, limit = 50, page = 1 } = req.query;
  const filter = {};

  // Trainers see only their sessions; trainees see sessions for their batch
  if (req.user.role === 'trainer') filter.trainerId = req.user._id;
  if (req.user.role === 'trainee') filter.batchId = req.user.batchId;
  if (status) filter.status = status;
  if (batchId) filter.batchId = batchId;

  const sessions = await Session.find(filter)
    .populate('trainerId', 'name avatar')
    .populate('batchId', 'name')
    .sort({ scheduledAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Session.countDocuments(filter);

  res.json({ success: true, sessions, total, page: Number(page) });
};

// GET /api/sessions/:id
const getSessionById = async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('trainerId', 'name email avatar')
    .populate('batchId', 'name');

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
};

// POST /api/sessions
const createSession = async (req, res) => {
  const session = await Session.create(req.body);
  await session.populate('trainerId', 'name avatar');

  // Notify trainers and trainees
  emitToRole('trainer', 'notification', {
    type: 'info',
    message: `New session scheduled: ${session.title}`,
  });

  res.status(201).json({ success: true, session });
};

// PUT /api/sessions/:id
const updateSession = async (req, res) => {
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('trainerId', 'name avatar');

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
};

// DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, message: 'Session deleted' });
};

// POST /api/sessions/:id/start (Trainer)
const startSession = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.trainerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not your session' });
  }

  const roomName = `session-${session._id}`;
  const token = await generateLiveKitToken(req.user, roomName, 'publisher');

  session.status = 'live';
  session.roomName = roomName;
  session.startedAt = new Date();
  await session.save();

  emitToRole('trainee', 'session:status', { id: session._id, status: 'live' });

  res.json({ success: true, token, roomName });
};

// POST /api/sessions/:id/join (Trainee)
const joinSession = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'live') {
    return res.status(400).json({ success: false, message: 'Session is not live yet' });
  }

  const token = await generateLiveKitToken(req.user, session.roomName, 'subscriber');
  res.json({ success: true, token, roomName: session.roomName });
};

// POST /api/sessions/:id/end (Trainer)
const endSession = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  session.status = 'completed';
  session.endedAt = new Date();
  await session.save();

  emitToRole('trainee', 'session:status', { id: session._id, status: 'completed' });

  res.json({ success: true, message: 'Session ended' });
};

module.exports = {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  joinSession,
  endSession,
};
