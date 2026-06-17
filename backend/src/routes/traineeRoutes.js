// src/routes/traineeRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');

const { generateLiveKitToken, LIVEKIT_URL } = require('../services/livekitService');

const router = express.Router();
router.use(protect, authorize('trainee'));

const traineeSessionFilter = (user) => ({
  $or: [
    { batchId:  { $in: user.batchIds || [] } },
    { trainees: user._id },
  ],
});
 
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
// Returns a LiveKit SUBSCRIBE-only token. Validates: session exists, is live,
// and the trainee is actually enrolled / in the batch.
router.post('/sessions/:id/join', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'live') {
      return res.status(409).json({ success: false, message: 'Session is not live yet' });
    }
 
    const batchIds   = (req.user.batchIds || []).map(String);
    const inBatch    = session.batchId && batchIds.includes(String(session.batchId));
    const isEnrolled = (session.trainees || []).some((t) => String(t) === String(req.user._id));
    if (!inBatch && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this session' });
    }
 
    // Optional passcode gate
    if (session.passcode && req.body?.passcode !== session.passcode) {
      return res.status(403).json({ success: false, message: 'Invalid passcode' });
    }
 
  
    // to allow the trainee to publish too:
      const token = await generateLiveKitToken(req.user, session.roomName, 'publisher');

    return res.json({ success: true, token, url: LIVEKIT_URL, roomName: session.roomName, role: 'student' });
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
      .populate('session', 'title scheduledAt').sort({ createdAt: -1 });
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
