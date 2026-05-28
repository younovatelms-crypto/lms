// src/models/Batch.js
'use strict';
const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  trainerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date },
  maxStudents: { type: Number, default: 30 },
  status:      { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  course:      { type: String, default: '' },
  tags:        [{ type: String }],
}, { timestamps: true });

batchSchema.index({ status: 1 });
batchSchema.index({ trainerId: 1 });

module.exports = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
