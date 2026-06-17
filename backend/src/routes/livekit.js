// routes/livekit.js — role derived from the session, not the request body
'use strict';
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const Session = require('../models/Session');
const auth = require('../middleware/auth'); // sets req.user = { id, name }
const router = express.Router();

const ROLE_GRANTS = {
  trainer: { canPublish: true,  canSubscribe: true, canPublishData: true, roomAdmin: true },
  student: { canPublish: true, canSubscribe: true, canPublishData: true },
};

// POST /api/livekit/token
// body: { room }  where room === `session_<sessionId>`  (sent by TraineeLiveSession)
router.post('/token', auth, async (req, res) => {
  try {
    const { room } = req.body || {};
    if (!room) return res.status(400).json({ message: 'room is required' });

    const apiKey    = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl     = process.env.LIVEKIT_URL; // the CLIENT connects to this

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('LiveKit env missing →', { key: !!apiKey, secret: !!apiSecret, url: !!wsUrl });
      return res.status(500).json({ message: 'LiveKit server is not configured' });
    }

    // Derive the session from the room name and verify membership.
    const sessionId = String(room).replace(/^session_/, '');
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const userId   = req.user.id;
    const isTrainer = String(session.trainer) === String(userId);
    const isTrainee = (session.trainees || []).some((t) => String(t) === String(userId));

    if (!isTrainer && !isTrainee) {
      return res.status(403).json({ message: 'You are not part of this session' });
    }

    // Role is decided HERE, on the server — the client cannot fake it.
    const role   = isTrainer ? 'trainer' : 'student';
    const grants = ROLE_GRANTS[role];

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,                 // unique + trustworthy (from the JWT)
      name: req.user.name || (isTrainer ? 'Trainer' : 'Trainee'),
      ttl: '2h',
    });
    at.addGrant({ roomJoin: true, room, ...grants });

    const token = await at.toJwt(); // v2: async
    return res.json({ token, url: wsUrl, role });
  } catch (err) {
    console.error('LiveKit token error →', err);
    return res.status(500).json({ message: err.message || 'Failed to generate token' });
  }
});

module.exports = router;

// Mount in app.js:
//   app.use('/api/livekit', require('./routes/livekit'));