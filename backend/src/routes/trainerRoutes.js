// src/routes/trainerRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Batch      = require('../models/Batch');
const User       = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('trainer'));

// GET /api/trainer/dashboard
router.get('/dashboard', async (req, res) => {
  const [upcomingSessions, liveSessions, pendingGrades, totalStudents] = await Promise.all([
    Session.find({ trainerId: req.user._id, status: 'scheduled', scheduledAt: { $gte: new Date() } })
      .populate('batchId', 'name').sort('scheduledAt').limit(5),
    Session.find({ trainerId: req.user._id, status: 'live' }).populate('batchId', 'name').limit(3),
    Assignment.countDocuments({ createdBy: req.user._id, 'submissions.status': 'submitted' }),
    User.countDocuments({ role: 'trainee', isActive: true }),
  ]);
  return res.json({ success: true, upcomingSessions, liveSessions, pendingGrades, totalStudents });
});

// GET /api/trainer/sessions?status=
router.get('/sessions', async (req, res) => {
  const { status } = req.query;
  const filter = { trainerId: req.user._id };
  if (status) filter.status = status;
  const sessions = await Session.find(filter).populate('batchId', 'name').sort('-scheduledAt').limit(50);
  return res.json({ success: true, sessions });
});

// GET /api/trainer/assignments
router.get('/assignments', async (req, res) => {
  const assignments = await Assignment.find({ createdBy: req.user._id })
    .populate('batchId', 'name').sort('-createdAt');
  return res.json({ success: true, assignments });
});

// GET /api/trainer/students  — trainees in trainer's batches
router.get('/students', async (req, res) => {
  const batches = await Batch.find({ trainerId: req.user._id }).select('_id');
  const batchIds = batches.map(b => b._id);
  const students = await User.find({ role: 'trainee', isActive: true, batchId: { $in: batchIds } })
    .populate('batchId', 'name').sort('name');
  return res.json({ success: true, students: students.map(s => s.toPublic()) });
});

// PUT /api/trainer/assignments/:id/grade/:submissionId
//   Body: { grade, feedback?, allowResubmit? }
router.put('/assignments/:id/grade/:submissionId', async (req, res) => {
  const { grade, feedback, allowResubmit } = req.body;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
  const sub = assignment.submissions.id(req.params.submissionId);
  if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
  Object.assign(sub, { grade, feedback: feedback || '', status: 'graded', gradedBy: req.user._id, gradedAt: new Date(), allowResubmit: Boolean(allowResubmit) });
  await assignment.save();
  return res.json({ success: true, submission: sub });
});

// GET /api/trainer/attendance/session/:sessionId
router.get('/attendance/session/:sessionId', async (req, res) => {
  const records = await Attendance.find({ session: req.params.sessionId })
    .populate('trainee', 'name email profilePicture');
  return res.json({ success: true, records });
});

module.exports = router;
