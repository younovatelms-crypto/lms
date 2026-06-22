// src/routes/traineeRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');

const {
  generateLiveKitToken,
  roomNameFor,            // ← canonical room name shared with the trainer
  LIVEKIT_URL,
} = require('../services/livekitService');
const { classifyAttendance } = require('../utils/attendanceUtils');

const router = express.Router();
router.use(protect, authorize('trainee'));

const traineeSessionFilter = (user) => ({
  $or: [
    { batchId:  { $in: user.batchIds || [] } },
    { trainees: user._id },
  ],
});

// Shared membership gate used by join + leave.
function ensureEnrolled(session, user) {
  const batchIds   = (user.batchIds || []).map(String);
  const inBatch    = session.batchId && batchIds.includes(String(session.batchId));
  const isEnrolled = (session.trainees || []).some((t) => String(t) === String(user._id));
  return inBatch || isEnrolled;
}

// GET /api/trainee/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const base = traineeSessionFilter(req.user);
    const [upcomingSessions, pendingAssignments] = await Promise.all([
      Session.find({ ...base, status: { $in: ['scheduled', 'live'] } })
        .populate('trainerId', 'name').sort('scheduledAt').limit(5),
      Assignment.countDocuments({ batchId: { $in: req.user.batchIds || [] }, status: 'active' }),
    ]);
    const total   = await Attendance.countDocuments({ trainee: req.user._id });
    const present = await Attendance.countDocuments({ trainee: req.user._id, status: { $in: ['present', 'late'] } });
    const pct     = total ? ((present / total) * 100).toFixed(1) : '0.0';

    return res.json({
      success: true,
      upcomingSessions,
      pendingAssignments,
      attendance: { total, present, percentage: pct },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/trainee/sessions?status=
router.get('/sessions', async (req, res) => {
  try {
    const filter = traineeSessionFilter(req.user);
    if (req.query.status) filter.status = req.query.status;
    const sessions = await Session.find(filter)
      .populate('trainerId', 'name profilePicture')
      .sort('-scheduledAt')
      .limit(50);
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/trainee/sessions/:id/join
// Returns a LiveKit token AND records the trainee's join time in the attendance
// module. The room name is the SAME canonical string the trainer used when going
// live, so the trainee actually lands in the trainer's room (video/audio/chat work).
router.post('/sessions/:id/join', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'live') {
      return res.status(409).json({ success: false, message: 'Session is not live yet' });
    }
    if (!ensureEnrolled(session, req.user)) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this session' });
    }
    if (session.passcode && req.body?.passcode !== session.passcode) {
      return res.status(403).json({ success: false, message: 'Invalid passcode' });
    }

    // ── Canonical room (MATCHES the trainer's go-live room) ──────────────────
    // Always recompute roomNameFor(session._id) rather than trusting the
    // persisted session.roomName — an older code path may have stored a room
    // string in a different format ("session-<id>"), which would silently put
    // the trainee in a DIFFERENT room from the trainer.
    const roomName = roomNameFor(session._id);

    // Trainee may publish camera/mic/screen + chat, but is NOT a room admin and
    // cannot trigger recording.
    const token = await generateLiveKitToken(req.user, roomName, {
      canPublish: true,
      roomAdmin:  false,
      roomRecord: false,
    });

    // ── Attendance: capture join time (best-effort; never blocks joining) ────
    try {
      const now = new Date();
      let att = await Attendance.findOne({ session: session._id, trainee: req.user._id });
      if (!att) {
        att = new Attendance({
          session: session._id,
          trainee: req.user._id,
          batch:   session.batchId,
        });
      }
      if (!att.joinedAt) att.joinedAt = now;        // keep the EARLIEST join time
      const { status } = classifyAttendance({ session, joinedAt: att.joinedAt, leftAt: null });
      att.status   = status;                        // 'present' or 'late' on entry
      att.source   = 'self';
      att.markedAt = now;
      if (session.batchId && !att.batch) att.batch = session.batchId;
      await att.save();
    } catch (attErr) {
      console.warn('⚠️  Attendance join-capture failed (joining anyway):', attErr.message);
    }

    return res.json({
      success: true,
      token,
      url: LIVEKIT_URL,
      roomName,
      role: 'student',
      canPublish: true,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/trainee/sessions/:id/attendance/leave
// Finalises attendance when the trainee leaves the room: stamps leftAt, computes
// how long they actually attended, and sets the final status
// (present | late | partial | absent) from the session timing.
// Best-effort by design — the frontend calls this on leave/disconnect.
router.post('/sessions/:id/attendance/leave', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).select('scheduledAt durationMinutes batchId trainees');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!ensureEnrolled(session, req.user)) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this session' });
    }

    const now = new Date();
    let att = await Attendance.findOne({ session: session._id, trainee: req.user._id });
    if (!att) {
      // Edge case: leave arrived without a prior join record — create one.
      att = new Attendance({
        session: session._id,
        trainee: req.user._id,
        batch:   session.batchId,
        joinedAt: now,
      });
    }
    att.leftAt = now;

    const { status, attendedSeconds } = classifyAttendance({
      session,
      joinedAt: att.joinedAt || now,
      leftAt:   now,
    });
    att.status          = status;
    att.attendedSeconds = attendedSeconds;
    att.source          = 'self';
    att.markedAt        = now;
    if (session.batchId && !att.batch) att.batch = session.batchId;
    await att.save();

    return res.json({
      success: true,
      record: {
        status:          att.status,
        joinedAt:        att.joinedAt,
        leftAt:          att.leftAt,
        attendedSeconds: att.attendedSeconds,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/trainee/assignments
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find({
      batchId: { $in: req.user.batchIds || [] },
      status:  { $ne: 'draft' },
    }).sort('-dueDate');
    const enriched = assignments.map((a) => {
      const sub = a.submissions.find((s) => s.trainee.toString() === req.user._id.toString());
      return { ...a.toObject(), mySubmission: sub || null };
    });
    return res.json({ success: true, assignments: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/trainee/assignments/:id/submit
router.post('/assignments/:id/submit', async (req, res) => {
  try {
    const { submissionUrl, notes } = req.body;
    if (!submissionUrl) return res.status(400).json({ success: false, message: 'submissionUrl required' });
    const assignment = await Assignment.findOne({
      _id: req.params.id, batchId: { $in: req.user.batchIds || [] }, status: 'active',
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or closed' });

    assignment.submissions = assignment.submissions.filter((s) => s.trainee.toString() !== req.user._id.toString());
    assignment.submissions.push({ trainee: req.user._id, submissionUrl, notes: notes || '', submittedAt: new Date(), status: 'submitted' });
    await assignment.save();
    return res.status(201).json({ success: true, submission: assignment.submissions[assignment.submissions.length - 1] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/trainee/attendance
router.get('/attendance', async (req, res) => {
  try {
    const records = await Attendance.find({ trainee: req.user._id })
      .populate('session', 'title scheduledAt durationMinutes').sort({ createdAt: -1 });
    const total   = records.length;
    const present = records.filter((r) => ['present', 'late'].includes(r.status)).length;
    return res.json({ success: true, records, stats: { total, present, percentage: total ? ((present / total) * 100).toFixed(1) : '0.0' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/trainee/profile
router.get('/profile', (req, res) => res.json({ success: true, user: req.user.toPublic() }));

module.exports = router;