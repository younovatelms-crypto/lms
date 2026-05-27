// src/routes/attendanceRoutes.js
// FIX: The old file had TWO separate route definitions (the actual attendanceRoutes.js
// and an inline duplicate inside sessionRoutes.js) both using different field names
// (session vs sessionId, trainee vs traineeId).  This single file is the truth.
// All queries now use the canonical field names: `session` and `trainee`.
const express    = require('express');
const router     = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Session    = require('../models/Session');

// ── POST /api/attendance/mark ─────────────────────────────────────────────
// Trainer marks attendance for all trainees in a session
// Body: { sessionId, records: [{ traineeId, status, note }] }
router.post('/mark', protect, authorize('trainer', 'admin'), async (req, res) => {
  const { sessionId, records } = req.body;

  if (!sessionId || !Array.isArray(records) || records.length === 0)
    return res.status(400).json({ success: false, message: 'sessionId and records[] are required' });

  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  const saved = await Promise.all(
    records.map(({ traineeId, status, note }) =>
      Attendance.findOneAndUpdate(
        // FIX: use canonical field names `session` and `trainee`
        { session: sessionId, trainee: traineeId },
        {
          session:  sessionId,
          trainee:  traineeId,
          batch:    session.batchId,
          status,
          note:     note || '',
          markedBy: req.user._id,
          markedAt: new Date(),
        },
        { upsert: true, new: true }
      )
    )
  );

  res.status(200).json({ success: true, message: 'Attendance marked', count: saved.length, data: saved });
});

// ── GET /api/attendance/session/:sessionId ────────────────────────────────
router.get('/session/:sessionId', protect, authorize('trainer', 'admin', 'hr'), async (req, res) => {
  const records = await Attendance.find({ session: req.params.sessionId })
    .populate('trainee',  'name email profilePicture batchId')
    .populate('session',  'title scheduledAt durationMinutes')
    .populate('markedBy', 'name');

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;

  res.status(200).json({
    success: true,
    count: records.length,
    summary: { present, absent, late },
    data: records,
  });
});

// ── GET /api/attendance/trainee/:traineeId ────────────────────────────────
router.get('/trainee/:traineeId', protect, async (req, res) => {
  const isSelf    = req.user._id.toString() === req.params.traineeId;
  const canAccess = ['admin', 'hr', 'trainer'].includes(req.user.role);
  if (!isSelf && !canAccess)
    return res.status(403).json({ success: false, message: 'Access denied' });

  const records = await Attendance.find({ trainee: req.params.traineeId })
    .populate('session', 'title scheduledAt durationMinutes batchId')
    .sort({ createdAt: -1 });

  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = total - present - late;
  const pct     = total ? (((present + late) / total) * 100).toFixed(1) : '0.0';

  res.status(200).json({
    success: true,
    summary: { total, present, late, absent, attendancePercentage: `${pct}%`, warning: parseFloat(pct) < 75 },
    data: records,
  });
});

// ── GET /api/attendance/batch/:batchId/summary ────────────────────────────
router.get('/batch/:batchId/summary', protect, authorize('admin', 'hr', 'trainer'), async (req, res) => {
  const sessions   = await Session.find({ batchId: req.params.batchId }).select('_id title scheduledAt');
  const sessionIds = sessions.map(s => s._id);

  const records = await Attendance.find({ session: { $in: sessionIds } })
    .populate('trainee', 'name email')
    .populate('session', 'title scheduledAt');

  const byTrainee = {};
  records.forEach(r => {
    const id = r.trainee?._id?.toString();
    if (!id) return;
    if (!byTrainee[id]) byTrainee[id] = { trainee: r.trainee, total: 0, present: 0, late: 0, absent: 0 };
    byTrainee[id].total++;
    if (r.status === 'present')      byTrainee[id].present++;
    else if (r.status === 'late')    byTrainee[id].late++;
    else                             byTrainee[id].absent++;
  });

  const report = Object.values(byTrainee).map(t => ({
    ...t,
    percentage: t.total ? (((t.present + t.late) / t.total) * 100).toFixed(1) : '0.0',
  }));

  res.status(200).json({
    success: true,
    totalSessions: sessions.length,
    trainees: report.length,
    data: report,
  });
});

// ── GET /api/attendance/report ────────────────────────────────────────────
router.get('/report', protect, authorize('admin', 'hr'), async (req, res) => {
  const { batchId, traineeId, fromDate, toDate, status } = req.query;
  const filter = {};

  if (traineeId) filter.trainee = traineeId;
  if (status)    filter.status  = status;
  if (fromDate || toDate) {
    filter.markedAt = {};
    if (fromDate) filter.markedAt.$gte = new Date(fromDate);
    if (toDate)   filter.markedAt.$lte = new Date(toDate);
  }
  if (batchId) {
    const sessions = await Session.find({ batchId }).select('_id');
    filter.session = { $in: sessions.map(s => s._id) };
  }

  const records = await Attendance.find(filter)
    .populate('trainee', 'name email batchId')
    .populate('session', 'title scheduledAt batchId')
    .sort({ markedAt: -1 })
    .limit(500);

  res.status(200).json({ success: true, count: records.length, data: records });
});

// ── PUT /api/attendance/:id ───────────────────────────────────────────────
router.put('/:id', protect, authorize('trainer', 'admin'), async (req, res) => {
  const { status, note } = req.body;
  const record = await Attendance.findByIdAndUpdate(
    req.params.id,
    { status, note },
    { new: true, runValidators: true }
  ).populate('trainee', 'name email').populate('session', 'title scheduledAt');

  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
  res.status(200).json({ success: true, data: record });
});

// ── DELETE /api/attendance/:id ────────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
  res.status(200).json({ success: true, message: 'Attendance record deleted' });
});

module.exports = router;
