// src/models/Session.js
'use strict';
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, default: '' },
  batchId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  trainerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  scheduledAt:     { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  status:          { type: String, enum: ['scheduled', 'live', 'completed', 'cancelled'], default: 'scheduled' },
  // LiveKit
  roomName:     { type: String, default: '' },
  recordingUrl: { type: String, default: '' },
  startedAt:    { type: Date },
  endedAt:      { type: Date },
  topics:       [{ type: String }],
  resources:    [{ name: String, url: String }],
}, { timestamps: true });

sessionSchema.index({ batchId: 1, scheduledAt: -1 });
sessionSchema.index({ trainerId: 1, status: 1 });
sessionSchema.index({ status: 1 });

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
