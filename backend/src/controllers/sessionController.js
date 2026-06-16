// src/controllers/sessionController.js
'use strict';
const Session = require('../models/Session');
const Recording = require('../models/Recording');
const { AccessToken } = require('livekit-server-sdk');

// NEW line I added (line 8):
const { generateLiveKitToken, startRecording, stopRecording, LIVEKIT_URL } = require('../services/livekitService');
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

/* POST /api/sessions/:id/start (Trainer)
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
}; */

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

/* POST /api/sessions/:id/end (Trainer)
const endSession = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  session.status = 'completed';
  session.endedAt = new Date();
  await session.save();

  emitToRole('trainee', 'session:status', { id: session._id, status: 'completed' });

  res.json({ success: true, message: 'Session ended' });
};  */



// POST /api/livekit/token
const  getToken = async (req, res) => {
  try {
    const { room, identity, name, role = 'trainer' } = req.body || {};
    if (!room || !identity) {
      return res.status(400).json({ success: false, message: 'room and identity are required' });
    }

    const apiKey    = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl     = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('[livekit] missing env →', { key: !!apiKey, secret: !!apiSecret, url: !!wsUrl });
      return res.status(500).json({
        success: false,
        message: 'LiveKit is not configured on the server (missing API key / secret / url).',
      });
    }

    const canPublish = role !== 'student'; // trainer publishes, student subscribe-only
    const at = new AccessToken(apiKey, apiSecret, { identity, name: name || identity, ttl: '2h' });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: canPublish, // lets a trainer trigger recording
    });

    const token = await at.toJwt();          // v2: lowercase + await
    return res.json({ success: true, token, url: wsUrl });
  } catch (err) {
    console.error('LiveKit token error →', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to generate token' });
  }
};








// POST /api/trainer/sessions/:id/start
const startSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const roomName = session._id.toString();
    const egressId = await startRecording(roomName);   // returns egress id

    // create the Recording row up-front; webhook fills the rest
    const recording = await Recording.create({
      sessionId: session._id,
      batchId:   session.batchId,
      trainerId: session.trainerId,
      egressId,
      roomName,
      status:    'active',
      startedAt: new Date(),
    });

    session.status          = 'live';
    session.roomName        = roomName;
    session.egressId        = egressId;
    session.recordingStatus = 'recording';
    session.startedAt       = new Date();
    session.recordings.push(recording._id);
    await session.save();

    res.json({ success: true, message: 'Session started & recording', session });
  } catch (err) {
    console.error('startSession error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/trainer/sessions/:id/end
const endSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    await stopRecording(session.egressId);             // fires the egress_ended webhook
    session.status          = 'completed';
    session.recordingStatus = 'processing';            // becomes 'available' in the webhook
    session.endedAt         = new Date();
    await session.save();

    res.json({ success: true, message: 'Session ended', session });
  } catch (err) {
    console.error('endSession error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
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
  getToken,
};
