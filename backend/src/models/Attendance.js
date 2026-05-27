// src/models/Attendance.js
// FIX: Unified field names to `session` and `trainee` (refs).
// The old code had TWO schemas: one in Session.js using sessionId/traineeId/batchId
// and one in Attendance.js using session/trainee. This single file is the truth.
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    session:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session',  required: true },
    trainee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    batch:    { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },   // denormalised for fast batch reports
    status:   { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'absent' },
    note:     { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date,   default: Date.now },
    joinedAt: { type: Date },
    leftAt:   { type: Date },
  },
  { timestamps: true }
);

// One record per trainee per session
attendanceSchema.index({ session: 1, trainee: 1 }, { unique: true });
attendanceSchema.index({ trainee: 1, createdAt: -1 });
attendanceSchema.index({ batch: 1 });
attendanceSchema.index({ session: 1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
