// src/routes/trainerRoutes.js
// FIX: Was a 3-line stub. Now fully implemented.
const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Session    = require('../models/Session');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User       = require('../models/User');

router.use(authenticate, authorize('trainer'));

// ── GET /api/trainer/dashboard ────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const [upcomingSessions, liveSessions, pendingGrades, totalStudents] = await Promise.all([
    Session.find({ trainerId: req.user._id, status: 'scheduled', scheduledAt: { $gte: new Date() } })
      .populate('batchId', 'name').sort('scheduledAt').limit(5),
    Session.find({ trainerId: req.user._id, status: 'live' })
      .populate('batchId', 'name').limit(3),
    Assignment.countDocuments({
      createdBy: req.user._id,
      'submissions.status': 'submitted',
    }),
    User.countDocuments({ role: 'trainee', isActive: true }),
  ]);

  res.json({ success: true, upcomingSessions, liveSessions, pendingGrades, totalStudents });
});

// ── GET /api/trainer/sessions ─────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  const { status } = req.query;
  const filter = { trainerId: req.user._id };
  if (status) filter.status = status;

  const sessions = await Session.find(filter)
    .populate('batchId', 'name')
    .sort('-scheduledAt')
    .limit(50);
  res.json({ success: true, sessions });
});

// ── GET /api/trainer/assignments ──────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  const assignments = await Assignment.find({ createdBy: req.user._id })
    .populate('batchId', 'name')
    .sort('-createdAt');
  res.json({ success: true, assignments });
});

// ── PUT /api/trainer/assignments/:id/grade/:submissionId ─────────────────
router.put('/assignments/:id/grade/:submissionId', async (req, res) => {
  const { grade, feedback, allowResubmit } = req.body;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const sub = assignment.submissions.id(req.params.submissionId);
  if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

  sub.grade        = grade;
  sub.feedback     = feedback || '';
  sub.status       = 'graded';
  sub.gradedBy     = req.user._id;
  sub.gradedAt     = new Date();
  sub.allowResubmit = Boolean(allowResubmit);
  await assignment.save();

  res.json({ success: true, submission: sub });
});

// ── GET /api/trainer/students ─────────────────────────────────────────────
router.get('/students', async (req, res) => {
  // Trainers see students in batches they own
  const Batch = require('../models/Batch');
  const batches = await Batch.find({ trainerId: req.user._id }).select('_id');
  const batchIds = batches.map(b => b._id);

  const students = await User.find({ role: 'trainee', isActive: true, batchId: { $in: batchIds } })
    .populate('batchId', 'name')
    .sort('name');
  res.json({ success: true, students: students.map(s => s.toPublic()) });
});

module.exports = router;
