// src/routes/adminRoutes.js
'use strict';
const express      = require('express');
const User         = require('../models/User');
const Registration = require('../models/Registration');
const Batch        = require('../models/Batch');
const Session      = require('../models/Session');
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

// ── PUBLIC — registration form (no auth required) ─────────────────────────────
// POST /api/admin/registrations  (public — called from landing page form)
//   Body: { fullName, email, phone?, programInterest?, source? }
router.post('/registrations', async (req, res) => {
  const { fullName, email, phone, programInterest, source } = req.body;
  if (!fullName || !email)
    return res.status(400).json({ success: false, message: 'fullName and email are required' });

  const existing = await Registration.findOne({ email: email.toLowerCase() });
  if (existing)
    return res.status(409).json({ success: false, message: 'This email has already been registered' });

  const reg = await Registration.create({
    fullName, email: email.toLowerCase(),
    phone: phone || '', programInterest: programInterest || '',
    source: source || 'web', status: 'registered',
  });
  return res.status(201).json({ success: true, message: 'Registration submitted', data: reg });
});

// ── All routes below require admin JWT ───────────────────────────────────────
router.use(protect, authorize('admin'));

// ── DASHBOARD ────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  const [
    totalTrainees, totalTrainers, totalBatches, activeBatches,
    totalSessions, activeRegistrations, placementReady, offerLetters, recentUsers, batchList,
  ] = await Promise.all([
    User.countDocuments({ role: 'trainee', isActive: true }),
    User.countDocuments({ role: 'trainer', isActive: true }),
    Batch.countDocuments(),
    Batch.countDocuments({ status: 'active' }),
    Session.countDocuments(),
    Registration.countDocuments({ status: { $in: ['registered', 'pending', 'lead'] } }),
    User.countDocuments({ role: 'trainee', placementStatus: 'ready' }),
    User.countDocuments({ role: 'trainee', placementStatus: 'placed' }),
    User.find({ role: 'trainee' }).sort({ createdAt: -1 }).limit(8).select('name createdAt placementStatus'),
    Batch.find({ status: 'active' }).limit(6).select('name status'),
  ]);

  const COLORS = ['#6366F1','#0D9488','#7C3AED','#C2410C','#1D4ED8','#15803D'];
  return res.json({
    success: true,
    data: {
      totalTrainees, totalTrainers, totalBatches, activeBatches,
      totalSessions, activeRegistrations, placementReady, offerLetters,
      batchAttendance: batchList.map((b, i) => ({ name: b.name, color: COLORS[i % 6] })),
      recentActivity: recentUsers.map(u => ({
        user: u.name, action: 'Joined platform', status: u.placementStatus,
        date: u.createdAt,
      })),
    },
  });
});

// ── USERS ─────────────────────────────────────────────────────────────────────
// GET /api/admin/users?role=&status=active|inactive&search=&page=1&limit=20
router.get('/users', async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role)   filter.role     = role;
  if (status) filter.isActive = status === 'active';
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  const skip  = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('batchId', 'name');
  return res.json({ success: true, data: { users: users.map(u => u.toPublic()), meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } } });
});

// POST /api/admin/users
//   Body: { name, email, password, role, batchId? }
router.post('/users', async (req, res) => {
  const { name, email, password, role, batchId } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ success: false, message: 'name, email, password, role required' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ success: false, message: 'Email already in use' });
  const user = await User.create({ name, email: email.toLowerCase(), password, role, batchId: batchId || null, isActive: true });
  return res.status(201).json({ success: true, data: user.toPublic() });
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: `Invalid ID: ${req.params.id}` });
    }
    
    const user = await User.findById(req.params.id).populate('batchId', 'name status');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/users/:id
//   Body: { name?, email?, role?, batchId?, isActive?, phone?, bio? }
// router.put('/users/:id', async (req, res) => {
//   try {
//     // Validate MongoDB ObjectId
//     if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({ success: false, message: `Invalid ID: ${req.params.id}` });
//     }
    
//     const allowed = ['name', 'email', 'role', 'batchId', 'isActive', 'phone', 'bio', 'skills', 'expertise'];
//     const updates = {};
//     allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    
//     const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });
//     return res.json({ success: true, data: user.toPublic() });
//   } catch (err) {
//     console.error('Update user error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    console.log('PUT API HIT');

    const { id } = req.params;

    console.log('Params:', req.params);
    console.log('Body:', req.body);

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user ID: ${id}`
      });
    }

    // Convert empty batchId to null
    if (req.body.batchId === '') {
      req.body.batchId = null;
    }

    // Allowed fields
    const allowedFields = [
      'name',
      'email',
      'role',
      'batchId',
      'isActive',
      'phone',
      'bio',
      'skills',
      'expertise'
    ];

    // Build updates object
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    console.log('Updates:', updates);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    console.log('Updated User:', updatedUser);

    // User not found
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (err) {
    console.error('Update User Error:', err);

    return res.status(400).json({
      success: false,
      error: err.message,
      fullError: err
    });
  }
});

module.exports = router;

// PATCH /api/admin/users/:id/status
//   Body: { isActive: boolean }
router.patch('/users/:id/status', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: `Invalid ID: ${req.params.id}` });
    }
    
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive (boolean) required' });
    
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    console.error('Update user status error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id  (hard delete - permanently removes user)
router.delete('/users/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: `Invalid ID: ${req.params.id}` });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: `User ${user.name} deleted permanently` });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── BATCHES ───────────────────────────────────────────────────────────────────
// GET /api/admin/batches?status=&page=1&limit=20
router.get('/batches', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip    = (Number(page) - 1) * Number(limit);
  const total   = await Batch.countDocuments(filter);
  const batches = await Batch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('trainerId', 'name email');
  return res.json({ success: true, data: { batches, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } } });
});

// POST /api/admin/batches
//   Body: { name, startDate, endDate?, trainerId?, maxStudents?, course?, description?, status? }
router.post('/batches', async (req, res) => {
  const { name, startDate } = req.body;
  if (!name || !startDate) return res.status(400).json({ success: false, message: 'name and startDate required' });
  const batch = await Batch.create(req.body);
  return res.status(201).json({ success: true, data: batch });
});

// PUT /api/admin/batches/:id
router.put('/batches/:id', async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  return res.json({ success: true, data: batch });
});

// DELETE /api/admin/batches/:id
router.delete('/batches/:id', async (req, res) => {
  const batch = await Batch.findByIdAndDelete(req.params.id);
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  return res.json({ success: true, message: 'Batch deleted' });
});

// ── REGISTRATIONS / LEADS ─────────────────────────────────────────────────────
// GET /api/admin/registrations?status=&search=&page=1&limit=20
router.get('/registrations', async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Registration.countDocuments(filter);
  const regs  = await Registration.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('convertedBy', 'name email');
  return res.json({ success: true, data: { registrations: regs, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } } });
});

// GET /api/admin/registrations/:id
router.get('/registrations/:id', async (req, res) => {
  const reg = await Registration.findById(req.params.id).populate('convertedBy traineeId', 'name email role');
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
  return res.json({ success: true, data: reg });
});

// PATCH /api/admin/registrations/:id
//   Body: { status?, notes? }
router.patch('/registrations/:id', async (req, res) => {
  const reg = await Registration.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
  return res.json({ success: true, data: reg });
});

// POST /api/admin/registrations/:id/convert — lead → trainee User account
router.post('/registrations/:id/convert', async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
  if (reg.status === 'converted') return res.status(409).json({ success: false, message: 'Already converted' });

  const exists = await User.findOne({ email: reg.email });
  if (exists) return res.status(409).json({ success: false, message: 'A user account already exists for this email' });

  const { batchId, role } = req.body;
  const user = await User.create({
    name: reg.fullName, email: reg.email,
    password: 'Younovate@123', // temporary — trainee must reset via forgot-password
    role: role || 'trainee', phone: reg.phone || '',
    batchId: batchId || null, isActive: true, enrolledAt: new Date(),
  });

  reg.status = 'converted'; reg.convertedAt = new Date(); reg.convertedBy = req.user._id; reg.traineeId = user._id;
  await reg.save();

  return res.status(201).json({ success: true, message: 'Lead converted to trainee', data: user.toPublic() });
});

// DELETE /api/admin/registrations/:id
router.delete('/registrations/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: `Invalid ID: ${req.params.id}` });
    }
    
    const reg = await Registration.findByIdAndDelete(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    return res.json({ success: true, message: 'Registration deleted' });
  } catch (err) {
    console.error('Delete registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
// GET /api/admin/analytics/placement
router.get('/analytics/placement', async (req, res) => {
  const pipeline = await User.aggregate([
    { $match: { role: 'trainee', isActive: true } },
    { $group: { _id: '$placementStatus', count: { $sum: 1 } } },
  ]);
  return res.json({ success: true, data: pipeline });
});
router.post('/trainers/:id/assign-batch', async (req, res) => {
  try {
    const trainer = await User.findById(req.params.id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    if (trainer.role !== 'trainer') {
      return res.status(400).json({
        success: false,
        message: 'User is not a trainer'
      });
    }

    const { batchId } = req.body;

    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    batch.trainerId = trainer._id;
    await batch.save();

    trainer.batchId = batch._id;
    await trainer.save();

    return res.status(200).json({
      success: true,
      message: 'Trainer assigned successfully',
      data: {
        trainerId: trainer._id,
        batchId: batch._id
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.post('/trainees/assign-batch', async (req, res) => {
  try {
    const { batchId, traineeIds } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    if (!Array.isArray(traineeIds) || traineeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one trainee'
      });
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const result = await User.updateMany(
      {
        _id: { $in: traineeIds },
        role: 'trainee'
      },
      {
        $set: {
          batchId: batch._id
        }
      }
    );

    return res.json({
      success: true,
      message: `${result.modifiedCount} trainees assigned successfully`,
      data: {
        batchId: batch._id,
        batchName: batch.name,
        assignedCount: result.modifiedCount
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
module.exports = router;
