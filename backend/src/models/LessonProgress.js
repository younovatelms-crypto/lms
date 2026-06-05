// LessonProgress = granular per-lesson completion / watch position for a learner.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const lessonProgressSchema = new Schema({
  student:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lesson:       { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  course:       { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment:   { type: Schema.Types.ObjectId, ref: 'Enrollment' },
  status:       { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  watchedSec:   { type: Number, default: 0 },              // video resume position
  completedAt:  { type: Date },
}, { timestamps: true });

// One progress doc per (student, lesson) — and the most common lookup.
lessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
lessonProgressSchema.index({ student: 1, course: 1, status: 1 }); // compute course progress fast

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);