// src/models/Recording.js  — one document per egress / recording
'use strict';
const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  batchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── LiveKit egress identity ─────────────────────────
  egressId: { type: String, required: true, unique: true, index: true },
  roomName: { type: String, default: '', index: true },

  // ── File / storage ──────────────────────────────────
  status:   { type: String, enum: ['starting', 'active', 'processing', 'completed', 'failed', 'aborted'], default: 'starting', index: true },
  url:      { type: String, default: '' },                                 // public or presigned URL
  filename: { type: String, default: '' },                                 // storage key / filepath
  storage:  { type: String, enum: ['s3', 'gcp', 'azure', 'local'], default: 'local' },
  format:   { type: String, default: 'mp4' },

  // ── Stats ───────────────────────────────────────────
  durationSeconds: { type: Number, default: 0 },
  sizeBytes:       { type: Number, default: 0 },
  startedAt: { type: Date },
  endedAt:   { type: Date },
  error:     { type: String, default: '' },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

recordingSchema.virtual('durationLabel').get(function () {
  const s = this.durationSeconds || 0;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
});

recordingSchema.virtual('sizeMB').get(function () {
  return this.sizeBytes ? +(this.sizeBytes / (1024 * 1024)).toFixed(1) : 0;
});

recordingSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.models.Recording || mongoose.model('Recording', recordingSchema);