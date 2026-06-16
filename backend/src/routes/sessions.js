// routes/sessions.js  — session lifecycle for trainer + trainees
'use strict';
const express = require('express');
const Session = require('../models/Session');
const auth = require('../middleware/auth'); // sets req.user = { id (or _id), name, role }
const { roomService, startRecording, stopRecording } = require('../services/livekitService');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

// Works whether your auth middleware sets req.user.id OR req.user._id.
const uid = (req) => String(req.user.id || req.user._id);

// Accept either an ISO `scheduledAt`, or separate `date` + `time` strings.
function toScheduledAt({ scheduledAt, date, time }) {
  if (scheduledAt) return new Date(scheduledAt);
  if (date && time) return new Date(`${date}T${time}`);
  if (date) return new Date(date);
  return null;
}

// ───────────────────────────────────────────────────────────
// GET /api/sessions
// Sessions relevant to the logged-in user:
//   - trainer  -> sessions they created
//   - trainee  -> sessions they're enrolled in
// Optional filters: ?batchId=... & ?status=...
// ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const me = uid(req);
    const filter = { $or: [{ trainerId: me }, { trainees: me }] };
    if (req.query.batchId) filter.batchId = req.query.batchId;
    if (req.query.status)  filter.status  = req.query.status;

    const sessions = await Session.find(filter)
      .populate('trainerId', 'name email')
      .sort({ scheduledAt: -1 });

    res.json(sessions);
  } catch (err) {
    console.error('list sessions error →', err);
    res.status(500).json({ message: err.message });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/sessions   (trainer schedules a session)
// ───────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role && req.user.role !== 'trainer') {
      return res.status(403).json({ message: 'Only trainers can create sessions' });
    }

    const { title, description, batchId, durationMinutes, topics, resources, trainees, timezone, passcode } = req.body || {};
    const scheduledAt = toScheduledAt(req.body || {});

    if (!title)       return res.status(400).json({ message: 'title is required' });
    if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt (or date/time) is required' });

    // deterministic, collision-resistant room name
    const roomName = `room_${batchId || 'adhoc'}_${Date.now()}`;

    const session = await Session.create({
      title,
      description,
      batchId,                       // optional now
      scheduledAt,
      durationMinutes,
      timezone,
      passcode,
      topics,
      resources,
      roomName,
      trainerId: uid(req),
      trainees: Array.isArray(trainees) ? trainees : [],
    });

    res.status(201).json(session);
  } catch (err) {
    console.error('create session error →', err);
    res.status(500).json({ message: err.message });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/sessions/:id/enroll   (trainee joins the roster)
// ───────────────────────────────────────────────────────────
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const me = uid(req);
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (['completed', 'cancelled'].includes(session.status)) {
      return res.status(409).json({ message: `Cannot enroll in a ${session.status} session` });
    }
    if (String(session.trainerId) === me) {
      return res.status(400).json({ message: 'You are the trainer/host of this session' });
    }

    await Session.updateOne({ _id: session._id }, { $addToSet: { trainees: me } }); // no duplicates
    const updated = await Session.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('enroll error →', err);
    res.status(500).json({ message: err.message });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/sessions/:id/start   (trainer goes live)
// Creates the LiveKit room + starts recording.
// ───────────────────────────────────────────────────────────
router.post('/:id/start', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.trainerId) !== uid(req)) {
      return res.status(403).json({ message: 'Only the trainer can start this session' });
    }

    await roomService.createRoom({ name: session.roomName, emptyTimeout: 300, maxParticipants: 200 });

    let egressId = '';
    try { egressId = await startRecording(session.roomName); }
    catch (e) { console.error('recording did not start →', e.message); } // don't block the class

    session.status    = 'live';
    session.startedAt = new Date();
    session.egressId  = egressId;
    session.recordingStatus = egressId ? 'recording' : 'none';
    await session.save();

    res.json({ session, roomName: session.roomName });
  } catch (err) {
    console.error('start session error →', err);
    res.status(500).json({ message: err.message });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/sessions/:id/join
// Token request — ONLY the trainer or an enrolled trainee may join.
// Role decides publish rights.
// ───────────────────────────────────────────────────────────
router.post('/:id/join', auth, async (req, res) => {
  try {
    const me = uid(req);
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'live') return res.status(409).json({ message: 'Session is not live' });

    const isTrainer  = String(session.trainerId) === me;
    const isEnrolled = (session.trainees || []).some((t) => String(t) === me);
    if (!isTrainer && !isEnrolled) {
      return res.status(403).json({ message: 'You are not enrolled in this session' });
    }

    // optional passcode gate for trainees
    if (!isTrainer && session.passcode && req.body?.passcode !== session.passcode) {
      return res.status(403).json({ message: 'Invalid passcode' });
    }

    const role     = isTrainer ? 'trainer' : 'student';
    const identity = `${role}-${me}`;

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET,
      { identity, name: req.user.name, ttl: '3h' });
    at.addGrant({
      roomJoin: true,
      room: session.roomName,
      canPublish: isTrainer,      // trainer publishes A/V, students subscribe only
      canSubscribe: true,
      canPublishData: true,       // chat / data channel for everyone
      roomAdmin: isTrainer,
    });

    res.json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL, role });
  } catch (err) {
    console.error('join error →', err);
    res.status(500).json({ message: err.message });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/sessions/:id/end   (trainer ends the session)
// Stops recording; webhook fills recordingUrl later.
// ───────────────────────────────────────────────────────────
router.post('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.trainerId) !== uid(req)) {
      return res.status(403).json({ message: 'Only the trainer can end this session' });
    }

    if (session.egressId) {
      try { await stopRecording(session.egressId); }
      catch (e) { console.error('stop recording failed →', e.message); }
      session.recordingStatus = 'processing';
    }
    try { await roomService.deleteRoom(session.roomName); } catch (_) {}

    session.status  = 'completed';
    session.endedAt = new Date();
    await session.save();

    res.json(session);
  } catch (err) {
    console.error('end session error →', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// Mount in app.js:
//   app.use('/api/sessions', require('./routes/sessions'));