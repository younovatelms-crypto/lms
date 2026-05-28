// src/routes/traineeRoutes.js
'use strict';
const express    = require('express');
const Session    = require('../models/Session');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('trainee'));

// GET /api/trainee/dashboard
router.get('/dashboard', async (req, res) => {
  const [upcomingSessions, pendingAssignments] = await Promise.all([
    Session.find({ batchId: req.user.batchId, status: { $in: ['scheduled', 'live'] } })
      .populate('trainerId', 'name').sort('scheduledAt').limit(5),
    Assignment.countDocuments({ batchId: req.user.batchId, status: 'active' }),
  ]);
  const total   = await Attendance.countDocuments({ trainee: req.user._id });
  const present = await Attendance.countDocuments({ trainee: req.user._id, status: { $in: ['present', 'late'] } });
  const pct     = total ? ((present / total) * 100).toFixed(1) : '0.0';

  return res.json({ success: true, upcomingSessions, pendingAssignments, attendance: { total, present, percentage: pct } });
});

// GET /api/trainee/sessions?status=
router.get('/sessions', async (req, res) => {
  const { status } = req.query;
  const filter = { batchId: req.user.batchId };
  if (status) filter.status = status;
  const sessions = await Session.find(filter).populate('trainerId', 'name profilePicture').sort('-scheduledAt').limit(50);
  return res.json({ success: true, sessions });
});

// GET /api/trainee/assignments
router.get('/assignments', async (req, res) => {
  const assignments = await Assignment.find({ batchId: req.user.batchId, status: { $ne: 'draft' } }).sort('-dueDate');
  const enriched = assignments.map(a => {
    const sub = a.submissions.find(s => s.trainee.toString() === req.user._id.toString());
    return { ...a.toObject(), mySubmission: sub || null };
  });
  return res.json({ success: true, assignments: enriched });
});

// POST /api/trainee/assignments/:id/submit
//   Body: { submissionUrl, notes? }
router.post('/assignments/:id/submit', async (req, res) => {
  const { submissionUrl, notes } = req.body;
  if (!submissionUrl) return res.status(400).json({ success: false, message: 'submissionUrl required' });
  const assignment = await Assignment.findOne({ _id: req.params.id, batchId: req.user.batchId, status: 'active' });
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or closed' });
  assignment.submissions = assignment.submissions.filter(s => s.trainee.toString() !== req.user._id.toString());
  assignment.submissions.push({ trainee: req.user._id, submissionUrl, notes: notes || '', submittedAt: new Date(), status: 'submitted' });
  await assignment.save();
  return res.status(201).json({ success: true, submission: assignment.submissions[assignment.submissions.length - 1] });
});

// GET /api/trainee/attendance
router.get('/attendance', async (req, res) => {
  const records = await Attendance.find({ trainee: req.user._id })
    .populate('session', 'title scheduledAt').sort({ createdAt: -1 });
  const total   = records.length;
  const present = records.filter(r => ['present', 'late'].includes(r.status)).length;
  return res.json({ success: true, records, stats: { total, present, percentage: total ? ((present/total)*100).toFixed(1) : '0.0' } });
});

// GET /api/trainee/profile
router.get('/profile', (req, res) => res.json({ success: true, user: req.user.toPublic() }));

module.exports = router;
