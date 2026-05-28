// src/models/Registration.js
'use strict';
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  fullName:        { type: String, required: true, trim: true },
  email:           { type: String, required: true, lowercase: true, trim: true },
  phone:           { type: String, default: '', trim: true },
  programInterest: { type: String, default: '', trim: true },
  source:          { type: String, enum: ['web', 'referral', 'social', 'direct', 'other'], default: 'web' },
  status:          { type: String, enum: ['lead', 'registered', 'pending', 'converted', 'rejected'], default: 'registered' },
  // Conversion tracking
  convertedAt: { type: Date, default: null },
  convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  traineeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes:       { type: String, default: '' },
}, { timestamps: true });

registrationSchema.index({ email: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
