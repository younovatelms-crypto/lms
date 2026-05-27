// src/routes/assignmentRoutes.js
// FIX: Was a stub returning empty arrays. Now fully implemented with proper
// role-based access, multer file upload, and grading support.
const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const Assignment = require('../models/Assignment');

// ── Multer config ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|zip|png|jpg|jpeg|mp4/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

router.use(authenticate);

// ── GET /api/assignments ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { batchId, status } = req.query;
  const filter = {};

  if (req.user.role === 'trainee') {
    filter.batchId = req.user.batchId;
    filter.status  = { $ne: 'draft' };
  } else if (req.user.role === 'trainer') {
    filter.createdBy = req.user._id;
  }

  if (batchId) filter.batchId = batchId;
  if (status)  filter.status  = status;

  const assignments = await Assignment.find(filter)
    .populate('batchId',   'name')
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.json({ success: true, assignments });
});

// ── GET /api/assignments/:id ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('batchId',   'name')
    .populate('createdBy', 'name')
    .populate('submissions.trainee',  'name email')
    .populate('submissions.gradedBy', 'name');

  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
  res.json({ success: true, assignment });
});

// ── POST /api/assignments ─────────────────────────────────────────────────
router.post('/', authorize('trainer', 'admin'), async (req, res) => {
  const { title, description, instructions, batchId, dueDate, maxScore, status } = req.body;
  if (!title || !batchId || !dueDate)
    return res.status(400).json({ success: false, message: 'title, batchId and dueDate required' });

  const assignment = await Assignment.create({
    title, description, instructions,
    batchId, dueDate, maxScore, status,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, assignment });
});

// ── PUT /api/assignments/:id ──────────────────────────────────────────────
router.put('/:id', authorize('trainer', 'admin'), async (req, res) => {
  const assignment = await Assignment.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized' });
  res.json({ success: true, assignment });
});

// ── DELETE /api/assignments/:id ───────────────────────────────────────────
router.delete('/:id', authorize('trainer', 'admin'), async (req, res) => {
  const assignment = await Assignment.findOneAndDelete({
    _id:       req.params.id,
    createdBy: req.user._id,
  });
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized' });
  res.json({ success: true, message: 'Assignment deleted' });
});

// ── POST /api/assignments/:id/submit ─────────────────────────────────────
router.post('/:id/submit', authorize('trainee'), upload.single('file'), async (req, res) => {
  const assignment = await Assignment.findOne({
    _id:    req.params.id,
    status: 'active',
  });
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or closed' });

  const submissionUrl = req.file
    ? `/uploads/${req.file.filename}`
    : req.body.submissionUrl;

  if (!submissionUrl)
    return res.status(400).json({ success: false, message: 'File or submissionUrl required' });

  // Upsert submission
  const idx = assignment.submissions.findIndex(
    s => s.trainee.toString() === req.user._id.toString()
  );

  const submissionData = {
    trainee:       req.user._id,
    submissionUrl,
    notes:         req.body.notes || '',
    submittedAt:   new Date(),
    status:        'submitted',
  };

  if (idx >= 0) {
    assignment.submissions[idx] = { ...assignment.submissions[idx].toObject(), ...submissionData, status: 'resubmitted' };
  } else {
    assignment.submissions.push(submissionData);
  }

  await assignment.save();
  res.json({ success: true, message: 'Assignment submitted' });
});

// ── PUT /api/assignments/:id/grade ────────────────────────────────────────
router.put('/:id/grade', authorize('trainer', 'admin'), async (req, res) => {
  const { traineeId, grade, feedback, allowResubmit } = req.body;
  if (!traineeId) return res.status(400).json({ success: false, message: 'traineeId required' });

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const sub = assignment.submissions.find(s => s.trainee.toString() === traineeId);
  if (!sub) return res.status(404).json({ success: false, message: 'Submission not found for this trainee' });

  sub.grade        = grade;
  sub.feedback     = feedback || '';
  sub.status       = 'graded';
  sub.gradedBy     = req.user._id;
  sub.gradedAt     = new Date();
  sub.allowResubmit = Boolean(allowResubmit);
  await assignment.save();

  res.json({ success: true, submission: sub });
});

module.exports = router;
