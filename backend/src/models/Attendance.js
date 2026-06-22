// src/models/Attendance.js
// Canonical field names: session / trainee / batch (NOT sessionId / traineeId)
//
// CHANGES (additive only — existing trainer/trainee behaviour is untouched):
//   • status enum now includes 'partial' (joined but attended only part of the session)
//   • attendedSeconds  — how long the trainee was actually in the room (computed on leave)
//   • source           — who/what produced the record: 'self' (auto on join/leave),
//                        'trainer' (manual marking), or 'system' (jobs). Defaults to
//                        'trainer' so legacy manual marking reads exactly as before.
'use strict';
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  session:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  trainee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  batch:    { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },   // denormalised for batch reports

  // 'partial' is NEW. Existing values keep working unchanged.
  status:   { type: String, enum: ['present', 'absent', 'late', 'partial', 'excused'], default: 'absent' },

  note:     { type: String, default: '' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  markedAt: { type: Date, default: Date.now },

  // ── Live-session capture ───────────────────────────────────────────
  joinedAt:        { type: Date },          // first time the trainee entered the LiveKit room
  leftAt:          { type: Date },          // last time the trainee left the room
  attendedSeconds: { type: Number, default: 0, min: 0 }, // overlap with the scheduled window
  source:          { type: String, enum: ['self', 'trainer', 'system'], default: 'trainer' },
}, { timestamps: true });

// Unique: one record per trainee per session
attendanceSchema.index({ session: 1, trainee: 1 }, { unique: true });
attendanceSchema.index({ trainee: 1, createdAt: -1 });
attendanceSchema.index({ batch: 1 });
attendanceSchema.index({ session: 1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);