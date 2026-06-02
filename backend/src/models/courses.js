// src/models/Course.js
'use strict';
const mongoose = require('mongoose');

/* ═══════════════════════════════════════════════════════════════════════════
   HOURS sub-schema  (S1–S4 breakdown used at the Subject level)
   total should equal s1Theory + s2Practical + s3Assignment + s4Feedback
   ═══════════════════════════════════════════════════════════════════════════ */
const hoursSchema = new mongoose.Schema({
  total:        { type: Number, default: 0, min: 0 },
  s1Theory:     { type: Number, default: 0, min: 0 },  // S1 — instructor-led theory
  s2Practical:  { type: Number, default: 0, min: 0 },  // S2 — labs / live coding
  s3Assignment: { type: Number, default: 0, min: 0 },  // S3 — take-home tasks
  s4Feedback:   { type: Number, default: 0, min: 0 },  // S4 — assessment / review
}, { _id: false });

/* ═══════════════════════════════════════════════════════════════════════════
   SUBJECT sub-schema  (a topic taught inside a month — the curriculum leaf)
   ═══════════════════════════════════════════════════════════════════════════ */
const subjectSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },   // e.g. "PHP Basics & OOP"
  category: { type: String, default: '', trim: true },      // e.g. "PHP Core & OOP"
  order:    { type: Number, default: 0 },

  hours:    { type: hoursSchema, default: () => ({}) },

  // Session content (maps to the S1–S3 columns of the workbook)
  theoryContent:     { type: String, default: '' },  // S1 theory content
  practicalActivity: { type: String, default: '' },  // S2 practical activity
  assignmentTask:    { type: String, default: '' },  // S3 assignment task

  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started',
  },
}, { _id: true });

/* ═══════════════════════════════════════════════════════════════════════════
   MONTH sub-schema  (M1–M9 — groups subjects, has its own week/hour totals)
   ═══════════════════════════════════════════════════════════════════════════ */
const monthSchema = new mongoose.Schema({
  monthNumber: { type: Number, required: true, min: 1, max: 9 }, // 1..9 (programme month)
  code:        { type: String, default: '', trim: true },        // "M1"
  name:        { type: String, required: true, trim: true },     // "Programming Fundamentals"
  days:        { type: Number, default: 30 },
  weeks:       { type: Number, default: 4 },
  totalHours:  { type: Number, default: 0, min: 0 },             // planned month total
  order:       { type: Number, default: 0 },
  subjects:    [subjectSchema],
}, { _id: true });

// Sum of subject hours for a month (computed, not stored)
monthSchema.virtual('computedHours').get(function () {
  return (this.subjects || []).reduce((acc, s) => {
    const h = s.hours || {};
    acc.total        += h.total        || 0;
    acc.s1Theory     += h.s1Theory     || 0;
    acc.s2Practical  += h.s2Practical  || 0;
    acc.s3Assignment += h.s3Assignment || 0;
    acc.s4Feedback   += h.s4Feedback   || 0;
    return acc;
  }, { total: 0, s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 });
});

/* ═══════════════════════════════════════════════════════════════════════════
   TRIMESTER sub-schema  (T1–T3 — groups months)
   ═══════════════════════════════════════════════════════════════════════════ */
const trimesterSchema = new mongoose.Schema({
  trimesterNumber: { type: Number, required: true, min: 1, max: 3 },  // 1..3
  code:  { type: String, default: '', trim: true },   // "T1"
  title: { type: String, required: true, trim: true },// "Engineering Foundations"
  focus: { type: String, default: '' },               // short focus line
  order: { type: Number, default: 0 },
  months: [monthSchema],
}, { _id: true });

trimesterSchema.virtual('computedHours').get(function () {
  return (this.months || []).reduce((acc, m) => {
    const h = m.computedHours;
    acc.total        += h.total;
    acc.s1Theory     += h.s1Theory;
    acc.s2Practical  += h.s2Practical;
    acc.s3Assignment += h.s3Assignment;
    acc.s4Feedback   += h.s4Feedback;
    return acc;
  }, { total: 0, s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Legacy MODULE sub-schema  (kept for backward compatibility with sessions
   that reference moduleId like "M4-LMS-01")
   ═══════════════════════════════════════════════════════════════════════════ */
const moduleSchema = new mongoose.Schema({
  moduleId:    { type: String, required: true, trim: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, { _id: true });

/* ═══════════════════════════════════════════════════════════════════════════
   COURSE schema
   ═══════════════════════════════════════════════════════════════════════════ */
const courseSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  code:        { type: String, required: true, trim: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  duration:    { type: Number, default: 0 },          // numeric length (unit below)
  durationUnit:{                                       // unit the frontend sends
    type: String,
    enum: ['hour', 'day', 'week', 'month', 'trimester', 'year'],
    default: 'week',
  },
  level:       { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  status:      { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },

  // ── Curriculum hierarchy ───────────────────────────────────────────────────
  trimesters:  [trimesterSchema],                     // T1..T3 -> months -> subjects

  // ── Legacy flat modules (optional / backward compatible) ───────────────────
  modules:     [moduleSchema],

  thumbnail:   { type: String, default: '' },
  tags:        [{ type: String }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

/* ─── Roll-up summary across the whole course ─────────────────────────────── */
courseSchema.virtual('summary').get(function () {
  const hours = { total: 0, s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 };
  let monthCount = 0, subjectCount = 0;
  (this.trimesters || []).forEach(t => {
    (t.months || []).forEach(m => {
      monthCount++;
      subjectCount += (m.subjects || []).length;
      const h = m.computedHours;
      hours.total        += h.total;
      hours.s1Theory     += h.s1Theory;
      hours.s2Practical  += h.s2Practical;
      hours.s3Assignment += h.s3Assignment;
      hours.s4Feedback   += h.s4Feedback;
    });
  });
  return {
    trimesters: (this.trimesters || []).length,
    months: monthCount,
    subjects: subjectCount,
    hours,
  };
});

/* ─── Flattened "hours matrix" (one row per subject, like the workbook) ────── */
courseSchema.methods.toHoursMatrix = function () {
  const rows = [];
  (this.trimesters || []).forEach(t => {
    (t.months || []).forEach(m => {
      (m.subjects || []).forEach(s => {
        const h = s.hours || {};
        rows.push({
          tri: t.code || `T${t.trimesterNumber}`,
          month: m.code || `M${m.monthNumber}`,
          monthName: m.name,
          subject: s.name,
          category: s.category,
          totalHrs: h.total || 0,
          s1Theory: h.s1Theory || 0,
          s2Practical: h.s2Practical || 0,
          s3Assignment: h.s3Assignment || 0,
          s4Feedback: h.s4Feedback || 0,
          status: s.status,
        });
      });
    });
  });
  return rows;
};

/* ─── Indexes ──────────────────────────────────────────────────────────────── */
// NOTE: `name` and `code` already get unique indexes from `unique: true` on the
// field definitions — do NOT add courseSchema.index({ name: 1 }) again or Mongoose
// warns about a duplicate index.
courseSchema.index({ status: 1 });
courseSchema.index({ 'trimesters.trimesterNumber': 1 });

module.exports = mongoose.models.Course || mongoose.model('courses', courseSchema);