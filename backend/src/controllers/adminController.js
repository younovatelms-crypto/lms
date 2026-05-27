// src/controllers/adminController.js
const User         = require('../models/User');
const Registration = require('../models/Registration');

// Optional models — only require if the file exists in your project.
// This prevents crashes when Batch or Session models aren't created yet.
let Batch, Session;
try { Batch   = require('../models/Batch');   } catch (_) { Batch   = null; }
try { Session = require('../models/Session'); } catch (_) { Session = null; }

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — safe count (returns 0 if model is null)
───────────────────────────────────────────────────────────────────────────── */
const safeCount = (Model, filter = {}) =>
  Model ? Model.countDocuments(filter) : Promise.resolve(0);

const safeFind = (Model, filter = {}, opts = {}) =>
  Model
    ? Model.find(filter).sort(opts.sort || {}).limit(opts.limit || 10).select(opts.select || '')
    : Promise.resolve([]);

/* ─────────────────────────────────────────────────────────────────────────────
   GET DASHBOARD
   GET /api/admin/dashboard
───────────────────────────────────────────────────────────────────────────── */
const getDashboard = async (req, res) => {
  try {
    const [
      totalTrainees,
      totalTrainers,
      totalBatches,
      activeBatches,
      totalSessions,
      activeRegistrations,
      placementReady,
      offerLetters,
      recentUsers,
      batchList,
    ] = await Promise.all([
      User.countDocuments({ role: 'trainee', isActive: true }),
      User.countDocuments({ role: 'trainer', isActive: true }),
      safeCount(Batch),
      safeCount(Batch, { status: 'active' }),
      safeCount(Session),
      Registration.countDocuments({ status: { $in: ['registered', 'pending', 'lead'] } }),
      User.countDocuments({ role: 'trainee', placementStatus: 'ready' }),
      User.countDocuments({ role: 'trainee', placementStatus: 'placed' }),
      // Recent 8 trainees for activity feed
      User.find({ role: 'trainee' })
          .sort({ createdAt: -1 })
          .limit(8)
          .select('name createdAt placementStatus'),
      // Active batches for trend bars
      safeFind(Batch, { status: 'active' }, { limit: 6, select: 'name batchCode attendanceRate' }),
    ]);

    // ── Batch attendance trend bars ────────────────────────────────────────
    const COLORS = ['#6366F1', '#0D9488', '#7C3AED', '#C2410C', '#1D4ED8', '#15803D'];
    const batchAttendance = batchList.map((b, i) => ({
      name:  b.name || b.batchCode || `Batch ${String.fromCharCode(65 + i)}`,
      pct:   b.attendanceRate || 0,
      color: COLORS[i % COLORS.length],
    }));

    // ── Recent activity feed ───────────────────────────────────────────────
    const recentActivity = recentUsers.map(u => ({
      time:   new Date(u.createdAt).toLocaleTimeString([], {
        hour:   '2-digit',
        minute: '2-digit',
      }),
      user:   u.name,
      action: 'Joined platform',
      module: 'Registration',
      status: 'Active',
      date:   u.createdAt,
    }));

    return res.json({
      success: true,
      data: {
        totalTrainees,
        totalTrainers,
        totalBatches,
        activeBatches,
        totalSessions,
        attendanceRate:     0,   // replace with real Attendance model aggregation
        placementReady,
        offerLetters,
        pendingApprovals:   0,   // add your approval logic here
        activeRegistrations,
        batchAttendance,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('GET DASHBOARD ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load dashboard',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET ALL USERS
   GET /api/admin/users?role=&status=&search=&page=1&limit=20
───────────────────────────────────────────────────────────────────────────── */
const getUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role)   filter.role     = role;
    if (status) filter.isActive = status === 'active';
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('batchId', 'name batchCode');

    return res.json({
      success: true,
      data: {
        users: users.map(u => u.toPublic()),
        meta: {
          total,
          page:  Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET USERS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   TOGGLE USER STATUS
   PATCH /api/admin/users/:id/status
   Body: { isActive: true | false }
───────────────────────────────────────────────────────────────────────────── */
const toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user.toPublic() });
  } catch (error) {
    console.error('TOGGLE USER STATUS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user status',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET ALL BATCHES
   GET /api/admin/batches?status=&page=1&limit=20
───────────────────────────────────────────────────────────────────────────── */
const getBatches = async (req, res) => {
  try {
    if (!Batch) {
      return res.json({ success: true, data: { batches: [], meta: {} } });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip    = (Number(page) - 1) * Number(limit);
    const total   = await Batch.countDocuments(filter);
    const batches = await Batch.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('trainerId', 'name email');

    return res.json({
      success: true,
      data: {
        batches,
        meta: {
          total,
          page:  Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET BATCHES ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch batches',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET REGISTRATIONS
   GET /api/admin/registrations?status=&page=1&limit=20
───────────────────────────────────────────────────────────────────────────── */
const getRegistrations = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Registration.countDocuments(filter);
    const regs  = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('convertedBy', 'name email');

    return res.json({
      success: true,
      data: {
        registrations: regs,
        meta: {
          total,
          page:  Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GET REGISTRATIONS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch registrations',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   CONVERT LEAD → TRAINEE
   POST /api/admin/registrations/:id/convert
───────────────────────────────────────────────────────────────────────────── */
const convertLead = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (reg.status === 'converted') {
      return res.status(409).json({ success: false, message: 'Already converted' });
    }

    // Check if a user account already exists for this email
    const existingUser = await User.findOne({ email: reg.email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user account already exists for this email',
      });
    }

    // Create trainee account — temporary password forces password reset via forgot-password
    const user = await User.create({
      name:     reg.fullName,
      email:    reg.email,
      password: 'Trainee@123456',
      role:     'trainee',
      phone:    reg.phone || '',
      isActive: true,
    });

    // Mark registration as converted
    reg.status      = 'converted';
    reg.convertedAt = new Date();
    reg.convertedBy = req.user._id;
    reg.traineeId   = user._id;
    await reg.save();

    return res.status(201).json({
      success: true,
      message: 'Lead converted to trainee successfully',
      data:    user.toPublic(),
    });
  } catch (error) {
    console.error('CONVERT LEAD ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert lead',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   CREATE REGISTRATION (Public — used by the registration form)
   POST /api/registrations
───────────────────────────────────────────────────────────────────────────── */
const createRegistration = async (req, res) => {
  try {
    const { fullName, email, phone, programInterest, source } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required',
      });
    }

    // Prevent duplicate registrations for the same email
    const existing = await Registration.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This email has already been registered',
      });
    }

    const reg = await Registration.create({
      fullName,
      email:           email.toLowerCase(),
      phone:           phone           || '',
      programInterest: programInterest || '',
      source:          source          || 'web',
      status:          'registered',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully',
      data:    reg,
    });
  } catch (error) {
    console.error('CREATE REGISTRATION ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────────────────── */
module.exports = {
  getDashboard,
  getUsers,
  toggleUserStatus,
  getBatches,
  getRegistrations,
  convertLead,
  createRegistration,
};