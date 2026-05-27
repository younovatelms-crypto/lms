// src/models/Registration.js
// Lead / Registration model for Younovate LMS
// Tracks public registrations from lead → registered → converted

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    // ── Applicant details ──────────────────────────────────────────────────
    fullName: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
    },
    phone: {
      type:    String,
      default: '',
      trim:    true,
    },

    // ── Program interest ───────────────────────────────────────────────────
    programInterest: {
      type:    String,
      default: '',
      trim:    true,
    },

    // ── Lead source ────────────────────────────────────────────────────────
    source: {
      type:    String,
      enum:    ['web', 'referral', 'social', 'direct', 'other'],
      default: 'web',
    },

    // ── Pipeline status ────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['lead', 'registered', 'pending', 'converted', 'rejected'],
      default: 'registered',
    },

    // ── Conversion tracking ────────────────────────────────────────────────
    convertedAt: {
      type:    Date,
      default: null,
    },
    convertedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    // Reference to the User doc created on conversion
    traineeId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Admin notes ────────────────────────────────────────────────────────
    notes: {
      type:    String,
      default: '',
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
registrationSchema.index({ email:  1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ source: 1 });
registrationSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Registration ||
  mongoose.model('Registration', registrationSchema);