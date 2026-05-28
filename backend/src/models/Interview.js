// src/models/Interview.js
'use strict';
const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  trainee:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:             { type: String, enum: ['mock', 'technical', 'hr', 'final', 'client'], required: true },
  status:           { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  scheduledAt:      { type: Date, required: true },
  interviewerName:  { type: String, default: '' },
  interviewerEmail: { type: String, default: '' },
  meetingLink:      { type: String, default: '' },
  notes:            { type: String, default: '' },
  outcome:          { type: String, enum: ['passed', 'failed', 'on_hold', ''], default: '' },
  feedback:         { type: String, default: '' },
  score:            { type: Number, min: 0, max: 100 },
  nextStep:         { type: String, default: '' },
  completedAt:      { type: Date },
  scheduledBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

interviewSchema.index({ trainee: 1, scheduledAt: -1 });
interviewSchema.index({ status: 1 });

module.exports = mongoose.models.Interview || mongoose.model('Interview', interviewSchema);
