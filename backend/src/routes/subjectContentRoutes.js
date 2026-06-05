// src/routes/subjectContentRoutes.js
//
// Mount in your app:
//   const subjectContentRoutes = require('./routes/subjectContentRoutes');
//   app.use('/api/courses', subjectContentRoutes);
//
// Routes (all prefixed with /api/courses):
//   GET    /:courseId/content                          → all content for a course
//   GET    /:courseId/subjects/:subjectId/content       → one subject's content
//   PUT    /:courseId/subjects/:subjectId/content       → create/update (upsert)  [admin/trainer]
//   DELETE /:courseId/subjects/:subjectId/content       → delete                  [admin]
//   POST   /:courseId/content/bulk                       → bulk upsert            [admin]

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const SubjectContent = require('../models/SubjectContent');
const Course = require('../models/Course');

// ── auth middleware (defensive: falls back to pass-through if path differs) ──
// Adjust the require path / export names to match your project, then delete the catch.
let protect = (req, res, next) => next();
let adminOnly = (req, res, next) => next();
try {
  const auth = require('../middleware/authMiddleware');
  protect = auth.protect || auth.requireAuth || protect;
  adminOnly = auth.adminOnly || auth.admin || adminOnly;
} catch (_) {
  // middleware module not found at that path — wire your own before production.
}

// ── helpers ──────────────────────────────────────────────────────────────────
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

// Walk the course tree and locate an embedded subject by its _id.
// Returns { trimesterNumber, monthNumber, subject } or null.
const locateSubject = (course, subjectId) => {
  const sid = String(subjectId);
  for (const t of course.trimesters || []) {
    for (const m of t.months || []) {
      for (const s of m.subjects || []) {
        if (String(s._id) === sid) {
          return { trimesterNumber: t.trimesterNumber, monthNumber: m.monthNumber, subject: s };
        }
      }
    }
  }
  return null;
};

// Fields a client is allowed to write.
const pickWritable = (body = {}) => {
  const out = {};
  ['theoryContent', 'practicalActivity', 'assignmentTask', 'trainerNotes', 'status'].forEach((k) => {
    if (body[k] !== undefined) out[k] = body[k];
  });
  if (body.feedback !== undefined) out.feedback = body.feedback;
  if (body.weekly !== undefined) out.weekly = body.weekly;
  return out;
};

// ════════════════════════════════════════════════════════════════════════════
// GET all content for a course → array + a map keyed by subjectId (easy merge on FE)
// ════════════════════════════════════════════════════════════════════════════
router.get('/:courseId/content', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isId(courseId)) return fail(res, 'Invalid course id');

    const items = await SubjectContent.find({ course: courseId }).lean({ virtuals: true });
    const bySubject = items.reduce((acc, doc) => {
      acc[String(doc.subjectId)] = doc;
      return acc;
    }, {});

    return ok(res, { items, bySubject, count: items.length });
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch content', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET one subject's content
// ════════════════════════════════════════════════════════════════════════════
router.get('/:courseId/subjects/:subjectId/content', protect, async (req, res) => {
  try {
    const { courseId, subjectId } = req.params;
    if (!isId(courseId) || !isId(subjectId)) return fail(res, 'Invalid id');

    const doc = await SubjectContent.findOne({ course: courseId, subjectId }).lean({ virtuals: true });
    if (!doc) return fail(res, 'Content not found for this subject', 404);

    return ok(res, doc);
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch content', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT upsert — create or update content for a subject. Validates the subject
// actually exists inside the course, and denormalises its context.
// ════════════════════════════════════════════════════════════════════════════
router.put('/:courseId/subjects/:subjectId/content', protect, adminOnly, async (req, res) => {
  try {
    const { courseId, subjectId } = req.params;
    if (!isId(courseId) || !isId(subjectId)) return fail(res, 'Invalid id');

    const course = await Course.findById(courseId).lean();
    if (!course) return fail(res, 'Course not found', 404);

    const found = locateSubject(course, subjectId);
    if (!found) return fail(res, 'Subject does not belong to this course', 404);

    const update = {
      ...pickWritable(req.body),
      course: courseId,
      subjectId,
      trimesterNumber: found.trimesterNumber,
      monthNumber: found.monthNumber,
      subjectName: found.subject.name,
      category: found.subject.category,
    };

    const doc = await SubjectContent.findOneAndUpdate(
      { subjectId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return ok(res, doc, 200);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'Content already exists for this subject', 409);
    return fail(res, err.message || 'Failed to save content', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE content for a subject
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:courseId/subjects/:subjectId/content', protect, adminOnly, async (req, res) => {
  try {
    const { courseId, subjectId } = req.params;
    if (!isId(courseId) || !isId(subjectId)) return fail(res, 'Invalid id');

    const r = await SubjectContent.deleteOne({ course: courseId, subjectId });
    if (r.deletedCount === 0) return fail(res, 'Content not found', 404);

    return ok(res, { deleted: true, subjectId });
  } catch (err) {
    return fail(res, err.message || 'Failed to delete content', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST bulk upsert — body: { items: [{ subjectId, theoryContent, ... }] }
// Each item must reference a subject that exists in the course.
router.post('/:courseId/content/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isId(courseId)) return fail(res, 'Invalid course id');

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return fail(res, 'No items provided');
    if (items.length > MAX_BULK) return fail(res, `Too many items (max ${MAX_BULK})`, 413);

    const course = await Course.findById(courseId).lean();
    if (!course) return fail(res, 'Course not found', 404);

    // de-dupe within the batch (last write wins) → avoids conflicting upserts
    const byId = new Map();
    const skipped = [];
    for (const it of items) {
      if (!isId(it?.subjectId)) { skipped.push({ subjectId: it?.subjectId ?? null, reason: 'invalid id' }); continue; }
      byId.set(String(it.subjectId), it);
    }

    const ops = [];
    for (const [sid, it] of byId) {
      const found = locateSubject(course, sid);
      if (!found) { skipped.push({ subjectId: sid, reason: 'not in course' }); continue; }
      ops.push({
        updateOne: {
          filter: { subjectId: sid },
          update: {
            $set: {
              ...sanitizeWritable(it),
              course: courseId,
              subjectId: sid,
              trimesterNumber: found.trimesterNumber,
              monthNumber: found.monthNumber,
              subjectName: found.subject.name,
              category: found.subject.category,
            },
          },
          upsert: true,
        },
      });
    }

    let result = null;
    if (ops.length) {
      try {
        result = await SubjectContent.bulkWrite(ops, { ordered: false });
      } catch (bulkErr) {
        // ordered:false → some writes may have succeeded; surface what we can
        result = bulkErr.result || null;
        if (!result) throw bulkErr;
      }
    }

    return ok(res, {
      received: items.length,
      written: ops.length,
      upserted: result?.upsertedCount ?? 0,
      modified: result?.modifiedCount ?? 0,
      matched: result?.matchedCount ?? 0,
      skipped,
    });
  } catch (err) {
    return fail(res, err.message || 'Bulk upsert failed', 500);
  }
});

module.exports = router;