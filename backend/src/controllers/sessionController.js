// src/controllers/sessionController.js  — CORRECTED
'use strict';
const Session   = require('../models/Session');
const Recording = require('../models/Recording');
const { AccessToken } = require('livekit-server-sdk');

const {
  generateLiveKitToken,
  startRecording,
  stopRecording,
  roomNameFor,
  LIVEKIT_URL,
} = require('../services/livekitService');

const { emitToRole, emitToUser } = require('../services/socketService');

// ════════════════════════════════════════════════════════════════════
// Basic CRUD (unchanged behaviour, kept for completeness)
// ════════════════════════════════════════════════════════════════════
const getSessions = async (req, res) => {
  const { status, batchId, limit = 50, page = 1 } = req.query;
  const filter = {};
  if (req.user.role === 'trainer') filter.trainerId = req.user._id;
  if (req.user.role === 'trainee') filter.batchId  = { $in: req.user.batchIds || [] };
  if (status)  filter.status  = status;
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

const getSessionById = async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('trainerId', 'name email avatar')
    .populate('batchId', 'name');
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
};

const createSession = async (req, res) => {
  const session = await Session.create({ ...req.body, trainerId: req.user._id });
  await session.populate('trainerId', 'name avatar');
  emitToRole('trainer', 'notification', { type: 'info', message: `New session: ${session.title}` });
  res.status(201).json({ success: true, session });
};

const updateSession = async (req, res) => {
  const session = await Session.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).populate('trainerId', 'name avatar');
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
};

const deleteSession = async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, message: 'Session deleted' });
};

// ════════════════════════════════════════════════════════════════════
// LIVE SESSION — the trainer↔trainee communication core
// ════════════════════════════════════════════════════════════════════

// POST /api/trainer/sessions/:id/start   (trainer "Go Live")
// → marks the session live, fixes the canonical room name, returns a
//   PUBLISH token so the trainer can stream camera/mic immediately.
//   Recording is best-effort: if egress isn't configured the session
//   still goes live (recording must never block the class).
const goLive = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (String(session.trainerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your session' });
    }

    const roomName = roomNameFor(session._id);   // ← canonical, shared by trainees

    // best-effort recording
    let egressId = '';
    try {
      egressId = await startRecording(roomName);
      if (egressId) {
        const recording = await Recording.create({
          sessionId: session._id,
          batchId:   session.batchId,
          trainerId: session.trainerId,
          egressId,
          roomName,
          status:    'active',
          startedAt: new Date(),
        });
        session.recordings.push(recording._id);
        session.recordingStatus = 'recording';
      }
    } catch (err) {
      console.warn('⚠️  Recording not started (going live anyway):', err.message);
      session.recordingStatus = 'none';
    }

    session.status    = 'live';
    session.roomName  = roomName;
    session.egressId  = egressId;
    session.startedAt = new Date();
    await session.save();

    const token = await generateLiveKitToken(req.user, roomName, { canPublish: true });

    // Tell trainees in real time that the room is open.
    emitToRole('trainee', 'session:status', { id: String(session._id), status: 'live' });
    (session.trainees || []).forEach((t) =>
      emitToUser(String(t), 'session:live', { sessionId: String(session._id), title: session.title })
    );

    return res.json({
      success:  true,
      message:  'Session is live',
      token,
      url:      LIVEKIT_URL,
      roomName,
      role:     'trainer',
      session,
    });
  } catch (err) {
    console.error('goLive error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/trainee/sessions/:id/join   (trainee joins as VIEWER)
// → SUBSCRIBE-only media token (no camera/mic) + canPublishData for chat.
const joinSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'live') {
      return res.status(409).json({ success: false, message: 'Session is not live yet' });
    }

    // membership check
    const batchIds   = (req.user.batchIds || []).map(String);
    const inBatch    = session.batchId && batchIds.includes(String(session.batchId));
    const isEnrolled = (session.trainees || []).some((t) => String(t) === String(req.user._id));
    if (!inBatch && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this session' });
    }

    if (session.passcode && req.body?.passcode !== session.passcode) {
      return res.status(403).json({ success: false, message: 'Invalid passcode' });
    }

    // Room MUST equal the bare session id to match the trainer Dashboard room.
    const roomName = String(session._id);
    const token    = await generateLiveKitToken(req.user, roomName, { canPublish: false });

    return res.json({ success: true, token, url: LIVEKIT_URL, roomName, role: 'student' });
  } catch (err) {
    console.error('joinSession error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT/POST /api/trainer/sessions/:id/end
const endSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, trainerId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    try { await stopRecording(session.egressId); } catch (_) { /* webhook still finalises */ }

    session.status  = 'completed';
    session.endedAt = new Date();
    if (session.recordingStatus === 'recording') session.recordingStatus = 'processing';
    await session.save();
    await session.populate('batchId', 'name');

    emitToRole('trainee', 'session:status', { id: String(session._id), status: 'completed' });

    return res.json({ success: true, message: 'Session ended', session });
  } catch (err) {
    console.error('endSession error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/livekit/token
// Backward-compatible token endpoint. Accepts BOTH request shapes:
//   • Trainer Dashboard.jsx →  { room, identity, name }   (room === session._id)
//   • Newer components      →  { sessionId }
// Role (canPublish) is derived from the SESSION when possible so the client
// can't promote itself; it falls back to the JWT role, then to a body hint.
const getToken = async (req, res) => {
  try {
    const body = req.body || {};

    // room is the bare session id. Accept either `room` or `sessionId`.
    let room = body.room || (body.sessionId ? roomNameFor(body.sessionId) : '');
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'room (or sessionId) is required',
      });
    }
    room = String(room);

    const apiKey    = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl     = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('[livekit] missing env →', { key: !!apiKey, secret: !!apiSecret, url: !!wsUrl });
      return res.status(500).json({ success: false, message: 'LiveKit is not configured on the server.' });
    }

    // Try to load the session (room === session._id) to set role securely.
    const sessionId = body.sessionId || room;
    let session = null;
    try { session = await Session.findById(sessionId); } catch (_) { /* room may not be an id */ }

    const user = req.user || null;   // present only if the route is behind `protect`
    let canPublish;
    if (session && user)      canPublish = String(session.trainerId) === String(user._id);
    else if (user)            canPublish = user.role === 'trainer';
    else                      canPublish = (body.role || 'trainer') !== 'student'; // legacy unauth path

    const identity = body.identity || (user ? String(user._id) : `guest-${Date.now()}`);
    const name     = body.name || user?.name || (canPublish ? 'Trainer' : 'Trainee');

    const at = new AccessToken(apiKey, apiSecret, { identity, name, ttl: '3h' });
    at.addGrant({
      roomJoin:       true,
      room,
      canPublish,
      canSubscribe:   true,
      canPublishData: true,        // everyone can chat
      roomRecord:     canPublish,
      roomAdmin:      canPublish,
    });

    const token = await at.toJwt();
    return res.json({ success: true, token, url: wsUrl, role: canPublish ? 'trainer' : 'student' });
  } catch (err) {
    console.error('getToken error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  goLive,        // trainer go-live (returns publish token)
  joinSession,   // trainee join (returns viewer token)
  endSession,
  getToken,
};