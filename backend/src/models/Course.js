// src/models/Course.js   (backend — Mongoose model)
// Nested curriculum model. Stores the FULL seed content directly on each
// embedded subject (theory / practical / assignment + order), plus month/
// trimester ordering, so GET /api/courses/:id returns everything the frontend
// needs without a side lookup.
//
//   Course
//     └─ trimesters[]  { code, title, focus, order, months[] }
//          └─ months[] { code, name, days, weeks, order, outcome,
//                        practicalSession, subjects[] }
//               └─ subjects[] { name, category, order, status, lmsModuleId,
//                               hours{s1..s4}, theoryContent,
//                               practicalActivity, assignmentTask }
//
//   GET /api/courses/:id  →  { success, data: { course, batches } }
//
// This model is shared by every program (YIEP, YBLP, …). The three fields
// added for YBLP — subject.lmsModuleId, month.outcome, month.practicalSession —
// are additive and default to '' , so existing YIEP documents are unaffected.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const HOURS_KEYS = ['s1Theory', 's2Practical', 's3Assignment', 's4Feedback'];
const subOpts = { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } };

// ── Hours (S1–S4) ─────────────────────────────────────────────────────────────
// YIEP : S1 Theory · S2 Practical · S3 Assignment · S4 Feedback
// YBLP : S1 Concept · S2 Practical · S3 Communication/Roleplay · (S4/S5 continuous → 0)
const HoursSchema = new Schema(
  {
    s1Theory:     { type: Number, default: 0, min: 0 },
    s2Practical:  { type: Number, default: 0, min: 0 },
    s3Assignment: { type: Number, default: 0, min: 0 },
    s4Feedback:   { type: Number, default: 0, min: 0 },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
// `total` is derived — the seed's literal `hours.total` is ignored on save.
HoursSchema.virtual('total').get(function () {
  return HOURS_KEYS.reduce((sum, k) => sum + (this[k] || 0), 0);
});

// ── Subject (carries the full content) ─────────────────────────────────────────
const SubjectSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    category:    { type: String, trim: true, default: '' },
    order:       { type: Number },
    status:      { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
    lmsModuleId: { type: String, trim: true, default: '' }, // e.g. "M1-LMS-01" (YBLP)
    hours:       { type: HoursSchema, default: () => ({}) },

    // ── curriculum content (S1 / S2 / S3) ──────────────────────────────────
    theoryContent:     { type: String, default: '' }, // S1
    practicalActivity: { type: String, default: '' }, // S2
    assignmentTask:    { type: String, default: '' }, // S3
  },
  subOpts
);

// ── Month ─────────────────────────────────────────────────────────────────────
const MonthSchema = new Schema(
  {
    monthNumber:      { type: Number },
    code:             { type: String, trim: true }, // e.g. "M1"
    name:             { type: String, trim: true },
    days:             { type: Number },
    weeks:            { type: Number },
    order:            { type: Number },
    outcome:          { type: String, default: '' }, // month-level learning outcome (YBLP)
    practicalSession: { type: String, default: '' }, // month-wide practical brief (YBLP)
    subjects:         { type: [SubjectSchema], default: [] },
  },
  subOpts
);
// derived — seed's literal `totalHours` is ignored
MonthSchema.virtual('totalHours').get(function () {
  return (this.subjects || []).reduce((sum, s) => sum + (s.hours ? s.hours.total : 0), 0);
});

// ── Trimester ───────────────────────────────────────────────────────────────
const TrimesterSchema = new Schema(
  {
    trimesterNumber: { type: Number },
    code:            { type: String, trim: true }, // e.g. "T1"
    title:           { type: String, trim: true },
    focus:           { type: String, trim: true, default: '' },
    order:           { type: Number },
    months:          { type: [MonthSchema], default: [] },
  },
  subOpts
);
TrimesterSchema.virtual('totalHours').get(function () {
  return (this.months || []).reduce(
    (sum, m) => sum + (m.subjects || []).reduce((a, s) => a + (s.hours ? s.hours.total : 0), 0),
    0
  );
});

// ── Course ───────────────────────────────────────────────────────────────────
const CourseSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    duration:    { type: Number, default: 0, min: 0 },
    durationUnit:{ type: String, enum: ['hour', 'day', 'week', 'month', 'trimester', 'year'], default: 'week' },
    level:       { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    status:      { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    tags:        { type: [String], default: [] },
    trimesters:  { type: [TrimesterSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Aggregated stats — for list cards, stat strips and exports.
CourseSchema.virtual('stats').get(function () {
  const hours = { s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 };
  let months = 0;
  let subjects = 0;
  (this.trimesters || []).forEach((t) => {
    months += (t.months || []).length;
    (t.months || []).forEach((m) => {
      (m.subjects || []).forEach((s) => {
        subjects += 1;
        HOURS_KEYS.forEach((k) => { hours[k] += (s.hours && s.hours[k]) || 0; });
      });
    });
  });
  const totalHours = HOURS_KEYS.reduce((sum, k) => sum + hours[k], 0);
  return { trimesters: (this.trimesters || []).length, months, subjects, sessionHours: hours, totalHours };
});

CourseSchema.virtual('subjectsCount').get(function () {
  return this.stats.subjects;
});

// `code` already has `unique: true` on the field — no separate index needed
// (that was the "Duplicate schema index on {code:1}" warning).
CourseSchema.index({ status: 1 });

module.exports = mongoose.models.Course || mongoose.model('Course', CourseSchema);