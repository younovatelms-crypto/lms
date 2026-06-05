// Enrollment = a learner's membership in a Program/Course/Batch with high-level progress.
// (Your existing Registration.js is likely the "sign-up" record; Enrollment tracks ongoing learning.)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const enrollmentSchema = new Schema({
  student:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  program:        { type: Schema.Types.ObjectId, ref: 'Program' },
  course:         { type: Schema.Types.ObjectId, ref: 'Course' },
  batch:          { type: Schema.Types.ObjectId, ref: 'Batch' },
  enrolledAt:     { type: Date, default: Date.now },
  expiresAt:      { type: Date },
  progressPercent:{ type: Number, default: 0, min: 0, max: 100 },
  completedLessons:{ type: Number, default: 0 },
  lastLesson:     { type: Schema.Types.ObjectId, ref: 'Lesson' }, // resume point
  lastAccessedAt: { type: Date },
  status:         { type: String, enum: ['active', 'completed', 'paused', 'expired', 'cancelled'], default: 'active' },
  certificate:    { type: Schema.Types.ObjectId, ref: 'Certificate' },
}, { timestamps: true });

// A student can enroll in a given program only once.
enrollmentSchema.index({ student: 1, program: 1 }, { unique: true, sparse: true });
enrollmentSchema.index({ student: 1, status: 1 });         // "my active courses"
enrollmentSchema.index({ batch: 1 });                      // roster of a batch
enrollmentSchema.index({ course: 1, status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);