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

// ─── GET /api/trainer/dashboard ───────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [upcomingSessions, liveSessions, pendingGrades, totalStudents] = await Promise.all([
      Session.find({ trainerId: req.user._id, status: 'scheduled', scheduledAt: { $gte: new Date() } })
        .populate('batchId', 'name').sort('scheduledAt').limit(5),
      Session.find({ trainerId: req.user._id, status: 'live' })
        .populate('batchId', 'name').limit(3),
      Assignment.countDocuments({ createdBy: req.user._id, 'submissions.status': 'submitted' }),
      User.countDocuments({ role: 'trainee', isActive: true }),
    ]);
    return res.json({ success: true, upcomingSessions, liveSessions, pendingGrades, totalStudents });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/trainer/sessions?status= ────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { trainerId: req.user._id };
    if (status) filter.status = status;
    const sessions = await Session.find(filter)
      .populate('batchId', 'name')
      .sort('-scheduledAt')
      .limit(50);
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/trainer/sessions ───────────────────────────────────────────────
// Body: { batch, moduleId, sessionType, scheduledAt, recordingLink?, title? }
// Response: { success: true, session: { _id, title, moduleId, status, scheduledAt, batchId } }
router.post('/sessions', async (req, res) => {
  try {
    const { batch, moduleId, sessionType, scheduledAt, recordingLink, title } = req.body;

    // Validate required fields
    if (!moduleId || !sessionType || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'moduleId, sessionType and scheduledAt are required',
      });
    }

    // Resolve batchId — accept batch name string or ObjectId
    let batchId = null;
    if (batch) {
      const batchDoc = await Batch.findOne({
        $or: [{ name: batch }, { _id: batch.match(/^[0-9a-fA-F]{24}$/) ? batch : null }],
      }).select('_id name');
      if (batchDoc) batchId = batchDoc._id;
    }

    const session = await Session.create({
      title:         title || `${moduleId} — ${sessionType}`,
      moduleId,
      lmsModuleId:   moduleId,          // keep both fields consistent
      sessionType,
      scheduledAt:   new Date(scheduledAt),
      recordingLink: recordingLink || '',
      status:        'scheduled',
      trainerId:     req.user._id,
      batchId:       batchId || undefined,
    });

    // Populate batchId.name for the frontend
    await session.populate('batchId', 'name');

    return res.status(201).json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/trainer/sessions/:id ────────────────────────────────────────────
// Body: { title?, scheduledAt?, status?, recordingLink? }
router.put('/sessions/:id', async (req, res) => {
  try {
    const allowed = ['title', 'scheduledAt', 'status', 'recordingLink', 'sessionType'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, trainerId: req.user._id },
      update,
      { new: true, runValidators: true }
    ).populate('batchId', 'name');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/trainer/sessions/:id/end ────────────────────────────────────────
// Marks a live session as completed
router.put('/sessions/:id/end', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, trainerId: req.user._id },
      { status: 'completed', endedAt: new Date() },
      { new: true }
    ).populate('batchId', 'name');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/trainer/sessions/:id ─────────────────────────────────────────
router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, trainerId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/trainer/assignments ─────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .populate('batchId', 'name')
      .sort('-createdAt');
    return res.json({ success: true, assignments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/trainer/students ────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const batches   = await Batch.find({ trainerId: req.user._id }).select('_id');
    const batchIds  = batches.map(b => b._id);
    const students  = await User.find({ role: 'trainee', isActive: true, batchId: { $in: batchIds } })
      .populate('batchId', 'name')
      .sort('name');
    return res.json({ success: true, students: students.map(s => s.toPublic()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/trainer/assignments/:id/grade/:submissionId ─────────────────────
// Body: { grade, feedback?, allowResubmit? }
// Response: { success: true, submission: { grade, status: "graded", gradedAt } }
router.put('/assignments/:id/grade/:submissionId', async (req, res) => {
  try {
    const { grade, feedback, allowResubmit } = req.body;
    if (grade === undefined || grade === null) {
      return res.status(400).json({ success: false, message: 'grade is required' });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const sub = assignment.submissions.id(req.params.submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    Object.assign(sub, {
      grade:         Number(grade),
      feedback:      feedback || '',
      status:        'graded',
      gradedBy:      req.user._id,
      gradedAt:      new Date(),
      allowResubmit: Boolean(allowResubmit),
    });

    await assignment.save();
    return res.json({ success: true, submission: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/trainer/attendance/session/:sessionId ───────────────────────────
// Response: { success: true, records: [{ trainee: { name, email }, status, markedAt }] }
router.get('/attendance/session/:sessionId', async (req, res) => {
  try {
    const records = await Attendance.find({ session: req.params.sessionId })
      .populate('trainee', 'name email profilePicture');
    return res.json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;