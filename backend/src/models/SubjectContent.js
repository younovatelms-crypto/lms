// src/models/SubjectContent.js
//
// One-to-one detail record for a single embedded Subject inside a Course.
// The Course doc stays light (name / category / status / hours); all the heavy
// curriculum text + trainer tracking lives here, linked by `subjectId`
// (the embedded subject's _id, e.g. 6a1e78a732bcf0dc40360e62).
//
//   Course.trimesters[].months[].subjects[]._id   ←──  SubjectContent.subjectId
//
//   GET  /api/courses/:courseId/content                          (all, for the detail page)
//   GET  /api/courses/:courseId/subjects/:subjectId/content      (one)
//   PUT  /api/courses/:courseId/subjects/:subjectId/content      (upsert)  [admin/trainer]
//   POST /api/courses/:courseId/content/bulk                     (bulk upsert) [admin]
//   DEL  /api/courses/:courseId/subjects/:subjectId/content      [admin]

const mongoose = require('mongoose');
const { Schema } = mongoose;

// S4 — trainer feedback / score
const FeedbackSchema = new Schema(
  {
    score:   { type: Number, min: 0, max: 10, default: null },
    remarks: { type: String, default: '' },
  },
  { _id: false }
);

// Weekly progress tracking (matches the W1–W4 columns in your sheet)
const WeeklySchema = new Schema(
  {
    w1: { type: Number, min: 0, max: 100, default: 0 },
    w2: { type: Number, min: 0, max: 100, default: 0 },
    w3: { type: Number, min: 0, max: 100, default: 0 },
    w4: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const SubjectContentSchema = new Schema(
  {
    // ── relations ──────────────────────────────────────────────────────────
    // `course` is a real ref → populate-able.
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // `subjectId` is the _id of an EMBEDDED subdocument inside Course, not a
    // collection of its own — so it cannot be populated. It is globally unique
    // (Mongo-generated ObjectId), which is what makes the 1:1 link safe.
    subjectId: { type: Schema.Types.ObjectId, required: true },

    // ── denormalised context (handy for queries / exports; optional) ─────────
    trimesterNumber: { type: Number },
    monthNumber:     { type: Number },
    subjectName:     { type: String, trim: true },
    category:        { type: String, trim: true, default: '' },

    // ── the heavy content (S1 / S2 / S3) ─────────────────────────────────────
    theoryContent:     { type: String, default: '' }, // S1
    practicalActivity: { type: String, default: '' }, // S2
    assignmentTask:    { type: String, default: '' }, // S3
    trainerNotes:      { type: String, default: '' },

    // ── tracking ─────────────────────────────────────────────────────────────
    feedback: { type: FeedbackSchema, default: () => ({}) }, // S4
    weekly:   { type: WeeklySchema,   default: () => ({}) },
    status:   { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  },
  {
    timestamps: true,
    minimize: false, // keep empty `feedback` / `weekly` objects in responses
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One content doc per subject — the 1:1 relation.
// (subjectId unique already serves `{ subjectId }` and `{ course, subjectId }`
//  lookups, so no extra compound index is needed.)
SubjectContentSchema.index({ subjectId: 1 }, { unique: true });

// Derived completion % = average of the four weekly values.
SubjectContentSchema.virtual('monthCompletion').get(function () {
  const w = this.weekly || {};
  return Math.round(((w.w1 || 0) + (w.w2 || 0) + (w.w3 || 0) + (w.w4 || 0)) / 4);
});

module.exports =
  mongoose.models.SubjectContent || mongoose.model('SubjectContent', SubjectContentSchema);