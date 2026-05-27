// src/routes/traineeRoutes.js
// FIX: Was a stub with wrong field name (traineeId instead of trainee in Attendance query)
const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Session    = require('../models/Session');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');

router.use(authenticate, authorize('trainee'));

// ── GET /api/trainee/dashboard ────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const [upcomingSessions, attendanceCount, pendingAssignments] = await Promise.all([
    Session.find({ batchId: req.user.batchId, status: { $in: ['scheduled', 'live'] } })
      .populate('trainerId', 'name')
      .sort('scheduledAt')
      .limit(5),
    // FIX: use canonical field `trainee`
    Attendance.countDocuments({ trainee: req.user._id, status: 'present' }),
    Assignment.countDocuments({ batchId: req.user.batchId, status: 'active' }),
  ]);

  // Attendance percentage
  const totalAttended = await Attendance.countDocuments({ trainee: req.user._id });
  const presentCount  = await Attendance.countDocuments({ trainee: req.user._id, status: { $in: ['present', 'late'] } });
  const attendancePct = totalAttended ? ((presentCount / totalAttended) * 100).toFixed(1) : '0.0';

  res.json({
    success: true,
    upcomingSessions,
    attendanceCount,
    pendingAssignments,
    attendancePct,
  });
});

// ── GET /api/trainee/sessions ─────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  const { status } = req.query;
  const filter = { batchId: req.user.batchId };
  if (status) filter.status = status;

  const sessions = await Session.find(filter)
    .populate('trainerId', 'name profilePicture')
    .sort('-scheduledAt')
    .limit(50);
  res.json({ success: true, sessions });
});

// ── GET /api/trainee/assignments ──────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  const assignments = await Assignment.find({
    batchId: req.user.batchId,
    status:  { $ne: 'draft' },
  }).sort('-dueDate');

  // Attach submission status for this trainee
  const enriched = assignments.map(a => {
    const sub = a.submissions.find(s => s.trainee.toString() === req.user._id.toString());
    return {
      ...a.toObject(),
      mySubmission: sub || null,
    };
  });

  res.json({ success: true, assignments: enriched });
});

// ── POST /api/trainee/assignments/:id/submit ──────────────────────────────
router.post('/assignments/:id/submit', async (req, res) => {
  const { submissionUrl, notes } = req.body;
  if (!submissionUrl)
    return res.status(400).json({ success: false, message: 'submissionUrl required' });

  const assignment = await Assignment.findOne({
    _id:     req.params.id,
    batchId: req.user.batchId,
    status:  'active',
  });
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or closed' });

  // Remove previous submission by this trainee if exists
  assignment.submissions = assignment.submissions.filter(
    s => s.trainee.toString() !== req.user._id.toString()
  );

  assignment.submissions.push({
    trainee:       req.user._id,
    submissionUrl,
    notes:         notes || '',
    submittedAt:   new Date(),
    status:        'submitted',
  });

  await assignment.save();
  const mySub = assignment.submissions[assignment.submissions.length - 1];
  res.status(201).json({ success: true, submission: mySub });
});

module.exports = router;
