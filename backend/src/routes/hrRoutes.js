// src/routes/hrRoutes.js
// FIX: Was a stub with empty implementations. Now fully implemented.
const express   = require('express');
const router    = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const User      = require('../models/User');
const Interview = require('../models/Interview');

router.use(authenticate, authorize('hr'));

// ── GET /api/hr/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const [
    totalTrainees,
    readyTrainees,
    placedTrainees,
    scheduledInterviews,
  ] = await Promise.all([
    User.countDocuments({ role: 'trainee', isActive: true }),
    User.countDocuments({ role: 'trainee', isActive: true, placementStatus: 'ready' }),
    User.countDocuments({ role: 'trainee', isActive: true, placementStatus: 'placed' }),
    Interview.countDocuments({ status: 'scheduled' }),
  ]);

  // Pipeline breakdown
  const pipeline = await User.aggregate([
    { $match: { role: 'trainee', isActive: true } },
    { $group: { _id: '$placementStatus', count: { $sum: 1 } } },
  ]);

  res.json({ success: true, totalTrainees, readyTrainees, placedTrainees, scheduledInterviews, pipeline });
});

// ── GET /api/hr/trainees ──────────────────────────────────────────────────
router.get('/trainees', async (req, res) => {
  const { placementStatus, batchId, search } = req.query;
  const filter = { role: 'trainee', isActive: true };
  if (placementStatus) filter.placementStatus = placementStatus;
  if (batchId)         filter.batchId         = batchId;
  if (search)          filter.name            = { $regex: search, $options: 'i' };

  const trainees = await User.find(filter)
    .populate('batchId', 'name status')
    .select('-password -sessionToken -refreshToken')
    .sort('-createdAt');

  res.json({ success: true, trainees });
});

// ── PATCH /api/hr/trainees/:id/placement ─────────────────────────────────
router.patch('/trainees/:id/placement', async (req, res) => {
  const { placementStatus, placementNote, companyName, ctc } = req.body;
  const update = { placementUpdatedAt: new Date() };
  if (placementStatus) update.placementStatus = placementStatus;
  if (placementNote)   update.placementNote   = placementNote;
  if (companyName)     update.companyName     = companyName;
  if (ctc)             update.ctc             = ctc;

  const trainee = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'trainee' },
    update,
    { new: true }
  );
  if (!trainee) return res.status(404).json({ success: false, message: 'Trainee not found' });
  res.json({ success: true, trainee: trainee.toPublic() });
});

// ── POST /api/hr/evaluations ──────────────────────────────────────────────
router.post('/evaluations', async (req, res) => {
  const { traineeId, communication, technical, confidence, overallScore, recommendation, evaluationNotes } = req.body;
  if (!traineeId) return res.status(400).json({ success: false, message: 'traineeId required' });

  const trainee = await User.findByIdAndUpdate(
    traineeId,
    {
      hrEvaluation: {
        communication,
        technical,
        confidence,
        overallScore,
        recommendation,
        evaluationNotes,
        evaluatedBy: req.user._id,
        evaluatedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!trainee) return res.status(404).json({ success: false, message: 'Trainee not found' });
  res.status(201).json({ success: true, evaluation: trainee.hrEvaluation });
});

// ── GET /api/hr/interviews ────────────────────────────────────────────────
router.get('/interviews', async (req, res) => {
  const { traineeId, status } = req.query;
  const filter = {};
  if (traineeId) filter.trainee = traineeId;
  if (status)    filter.status  = status;

  const interviews = await Interview.find(filter)
    .populate('trainee', 'name email')
    .populate('scheduledBy', 'name')
    .sort('-scheduledAt');

  res.json({ success: true, interviews });
});

// ── POST /api/hr/interviews ───────────────────────────────────────────────
router.post('/interviews', async (req, res) => {
  const {
    traineeId, type, scheduledAt, interviewerName,
    interviewerEmail, meetingLink, notes,
  } = req.body;

  if (!traineeId || !type || !scheduledAt)
    return res.status(400).json({ success: false, message: 'traineeId, type and scheduledAt required' });

  const interview = await Interview.create({
    trainee: traineeId,
    type,
    scheduledAt,
    interviewerName,
    interviewerEmail,
    meetingLink,
    notes,
    scheduledBy: req.user._id,
  });

  // Update trainee placement status
  await User.findByIdAndUpdate(traineeId, { placementStatus: 'interview_scheduled' });

  res.status(201).json({ success: true, interview });
});

// ── PUT /api/hr/interviews/:id ────────────────────────────────────────────
router.put('/interviews/:id', async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('trainee', 'name email');

  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, interview });
});

// ── PUT /api/hr/pipeline/:id ──────────────────────────────────────────────
router.put('/pipeline/:id', async (req, res) => {
  const { placementStatus, placementNote, companyName, ctc } = req.body;
  const update = { placementUpdatedAt: new Date() };
  if (placementStatus) update.placementStatus = placementStatus;
  if (placementNote)   update.placementNote   = placementNote;
  if (companyName)     update.companyName     = companyName;
  if (ctc)             update.ctc             = ctc;

  const candidate = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
  res.json({ success: true, candidate: candidate.toPublic() });
});

module.exports = router;
