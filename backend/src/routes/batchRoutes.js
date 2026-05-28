// src/routes/batchRoutes.js
'use strict';
const express = require('express');
const Batch   = require('../models/Batch');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

// GET /api/batches?status=&page=1&limit=20
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (req.user.role === 'trainer') filter.trainerId = req.user._id;
  const total   = await Batch.countDocuments(filter);
  const batches = await Batch.find(filter).sort({ createdAt: -1 })
    .skip((Number(page)-1)*Number(limit)).limit(Number(limit))
    .populate('trainerId', 'name email');
  return res.json({ success: true, data: { batches, meta: { total, page: Number(page), limit: Number(limit) } } });
});

// GET /api/batches/:id
router.get('/:id', async (req, res) => {
  const batch = await Batch.findById(req.params.id).populate('trainerId', 'name email');
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  const students = await User.find({ batchId: batch._id, role: 'trainee' }).select('name email placementStatus');
  return res.json({ success: true, data: { batch, students } });
});

// POST /api/batches  [admin]
router.post('/', authorize('admin'), async (req, res) => {
  const batch = await Batch.create(req.body);
  return res.status(201).json({ success: true, data: batch });
});

// PUT /api/batches/:id  [admin]
router.put('/:id', authorize('admin'), async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  return res.json({ success: true, data: batch });
});

// DELETE /api/batches/:id  [admin]
router.delete('/:id', authorize('admin'), async (req, res) => {
  const batch = await Batch.findByIdAndDelete(req.params.id);
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  return res.json({ success: true, message: 'Batch deleted' });
});

module.exports = router;
