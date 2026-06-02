// src/routes/courseRoutes.js
'use strict';
const express = require('express');
const Course  = require('../models/courses');
const Batch   = require('../models/Batch');
const { protect, authorize } = require('../middleware/auth');
const { YIEP_COURSE, YIEP_TRIMESTERS } = require('../data/yiepCurriculum');

const router = express.Router();
router.use(protect);   // all routes require login

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Load a course or send 404. Returns the doc (or null after responding).
async function loadCourse(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found' });
    return null;
  }
  return course;
}

// Find a trimester subdoc by _id, trimesterNumber, or code (e.g. "T1").
function findTrimester(course, key) {
  return course.trimesters.id(key) ||
    course.trimesters.find(t =>
      String(t.trimesterNumber) === String(key) ||
      (t.code && t.code.toUpperCase() === String(key).toUpperCase()));
}

// Find a month subdoc by _id, monthNumber, or code (e.g. "M4").
function findMonth(trimester, key) {
  return trimester.months.id(key) ||
    trimester.months.find(m =>
      String(m.monthNumber) === String(key) ||
      (m.code && m.code.toUpperCase() === String(key).toUpperCase()));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/courses
// Query: ?status=active&page=1&limit=0 (limit=0 = all)&fields=summary
// Response: { success, data: { courses:[...], meta:{total,page,limit,pages} } }
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { status, level, page = 1, limit = 0, search, fields } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (level)  filter.level  = level;
    if (search) filter.name   = { $regex: search, $options: 'i' };

    const total = await Course.countDocuments(filter);

    let query = Course.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Lightweight listing: drop the heavy curriculum tree when only a summary is needed
    if (fields === 'summary') query = query.select('-trimesters -modules');

    if (Number(limit) > 0) {
      query = query
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    }

    const courses = await query;

    return res.json({
      success: true,
      data: {
        courses,
        meta: {
          total,
          page:  Number(page),
          limit: Number(limit),
          pages: Number(limit) > 0 ? Math.ceil(total / Number(limit)) : 1,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/courses/:id
// Response: { success, data: { course:{...}, batches:[...] } }
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const batches = await Batch.find({
      $or: [{ course: course.code }, { course: course.name }],
    })
      .select('name status trainerId startDate')
      .populate('trainerId', 'name email');

    return res.json({ success: true, data: { course, batches } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/courses/:id/curriculum   — full trimester→month→subject tree + summary
// GET /api/courses/:id/hours-matrix — flattened one-row-per-subject matrix
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id/curriculum', async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    return res.json({
      success: true,
      data: { trimesters: course.trimesters, summary: course.summary },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/hours-matrix', async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    return res.json({ success: true, data: { rows: course.toHoursMatrix(), summary: course.summary } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/courses  [admin only]
// Body: { name, code, description, duration, level, status, trimesters[], modules[], tags[] }
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, createdBy: req.user._id });
    return res.status(201).json({ success: true, data: course });
  } catch (err) {
    const msg = err.code === 11000 ? 'Course name or code already exists' : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/courses/:id  [admin only]
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    // Don't let a blanket update wipe the curriculum tree — use the dedicated
    // /curriculum and /trimesters endpoints for that.
    const body = { ...req.body };
    delete body.trimesters;

    const course = await Course.findByIdAndUpdate(req.params.id, body,
      { new: true, runValidators: true }).populate('createdBy', 'name email');

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.json({ success: true, data: course });
  } catch (err) {
    const msg = err.code === 11000 ? 'Course name or code already exists' : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/courses/:id  [admin only]  — blocked if active/upcoming batches exist
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const linkedBatches = await Batch.countDocuments({
      $or: [{ course: course.code }, { course: course.name }],
      status: { $in: ['upcoming', 'active'] },
    });
    if (linkedBatches > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${linkedBatches} active/upcoming batch(es) use this course`,
      });
    }

    await Course.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CURRICULUM — bulk set the whole trimester tree  [admin only]
// PUT /api/courses/:id/curriculum
// Body: { trimesters: [ { trimesterNumber, title, months:[ { monthNumber, name,
//          subjects:[ { name, category, hours:{...} } ] } ] } ] }
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/:id/curriculum', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    if (!Array.isArray(req.body.trimesters)) {
      return res.status(400).json({ success: false, message: 'trimesters[] is required' });
    }
    course.trimesters = req.body.trimesters;
    await course.save();
    return res.json({ success: true, data: { trimesters: course.trimesters, summary: course.summary } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIMESTERS  [admin only]
// POST   /api/courses/:id/trimesters
// PUT    /api/courses/:id/trimesters/:tri        (tri = _id | number | code)
// DELETE /api/courses/:id/trimesters/:tri
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/trimesters', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    course.trimesters.push(req.body);
    course.trimesters.sort((a, b) => (a.order || a.trimesterNumber) - (b.order || b.trimesterNumber));
    await course.save();
    return res.status(201).json({ success: true, data: course.trimesters });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id/trimesters/:tri', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });

    // Apply scalar fields only; months are managed via month endpoints
    const { months, ...fields } = req.body;
    Object.assign(tri, fields);
    if (Array.isArray(months)) tri.months = months;
    await course.save();
    return res.json({ success: true, data: tri });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id/trimesters/:tri', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    tri.deleteOne();
    await course.save();
    return res.json({ success: true, message: 'Trimester removed', data: course.trimesters });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MONTHS  [admin only]
// POST   /api/courses/:id/trimesters/:tri/months
// PUT    /api/courses/:id/trimesters/:tri/months/:mon       (mon = _id | number | code)
// DELETE /api/courses/:id/trimesters/:tri/months/:mon
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/trimesters/:tri/months', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    tri.months.push(req.body);
    tri.months.sort((a, b) => (a.order || a.monthNumber) - (b.order || b.monthNumber));
    await course.save();
    return res.status(201).json({ success: true, data: tri.months });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id/trimesters/:tri/months/:mon', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    const month = findMonth(tri, req.params.mon);
    if (!month) return res.status(404).json({ success: false, message: 'Month not found' });

    const { subjects, ...fields } = req.body;
    Object.assign(month, fields);
    if (Array.isArray(subjects)) month.subjects = subjects;
    await course.save();
    return res.json({ success: true, data: month });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id/trimesters/:tri/months/:mon', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    const month = findMonth(tri, req.params.mon);
    if (!month) return res.status(404).json({ success: false, message: 'Month not found' });
    month.deleteOne();
    await course.save();
    return res.json({ success: true, message: 'Month removed', data: tri.months });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS  [admin only]
// POST   /api/courses/:id/trimesters/:tri/months/:mon/subjects
// PUT    /api/courses/:id/trimesters/:tri/months/:mon/subjects/:subId
// DELETE /api/courses/:id/trimesters/:tri/months/:mon/subjects/:subId
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/trimesters/:tri/months/:mon/subjects', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    const month = findMonth(tri, req.params.mon);
    if (!month) return res.status(404).json({ success: false, message: 'Month not found' });
    month.subjects.push(req.body);
    month.subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    await course.save();
    return res.status(201).json({ success: true, data: month.subjects });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id/trimesters/:tri/months/:mon/subjects/:subId', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    const month = findMonth(tri, req.params.mon);
    if (!month) return res.status(404).json({ success: false, message: 'Month not found' });
    const subject = month.subjects.id(req.params.subId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    Object.assign(subject, req.body);
    await course.save();
    return res.json({ success: true, data: subject });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id/trimesters/:tri/months/:mon/subjects/:subId', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    const tri = findTrimester(course, req.params.tri);
    if (!tri) return res.status(404).json({ success: false, message: 'Trimester not found' });
    const month = findMonth(tri, req.params.mon);
    if (!month) return res.status(404).json({ success: false, message: 'Month not found' });
    const subject = month.subjects.id(req.params.subId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    subject.deleteOne();
    await course.save();
    return res.json({ success: true, message: 'Subject removed', data: month.subjects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY MODULES  [admin only] — kept for session compatibility
// POST   /api/courses/:id/modules
// DELETE /api/courses/:id/modules/:moduleId
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/modules', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    course.modules.push(req.body);
    await course.save();
    return res.json({ success: true, data: course });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id/modules/:moduleId', authorize('admin'), async (req, res) => {
  try {
    const course = await loadCourse(req, res); if (!course) return;
    course.modules = course.modules.filter(m => m._id.toString() !== req.params.moduleId);
    await course.save();
    return res.json({ success: true, data: course });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEED — create (or rebuild) the full YIEP course with all T1/T2/T3 data [admin]
// POST /api/courses/seed/yiep
// Query: ?force=true  → overwrite the curriculum if the course already exists
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/seed/yiep', authorize('admin'), async (req, res) => {
  try {
    const force = req.query.force === 'true';
    let course = await Course.findOne({ code: YIEP_COURSE.code });

    if (course && !force) {
      return res.status(409).json({
        success: false,
        message: 'YIEP course already exists. Pass ?force=true to rebuild its curriculum.',
        data: { id: course._id, summary: course.summary },
      });
    }

    if (course) {
      Object.assign(course, YIEP_COURSE);
      course.trimesters = YIEP_TRIMESTERS;
    } else {
      course = new Course({ ...YIEP_COURSE, trimesters: YIEP_TRIMESTERS, createdBy: req.user._id });
    }
    await course.save();

    return res.status(201).json({
      success: true,
      message: force ? 'YIEP curriculum rebuilt' : 'YIEP course created',
      data: { id: course._id, code: course.code, summary: course.summary },
    });
  } catch (err) {
    const msg = err.code === 11000 ? 'Course name or code already exists' : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
});

module.exports = router;