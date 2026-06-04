// src/models/User.js
'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

// ── Sub-schema: HR Evaluation ─────────────────────────────────────────────────
const hrEvaluationSchema = new mongoose.Schema({
  communication:         { type: Number, min: 0, max: 100 },
  technical:             { type: Number, min: 0, max: 100 },
  problemSolving:        { type: Number, min: 0, max: 100 },
  attitude:              { type: Number, min: 0, max: 100 },
  learningAgility:       { type: Number, min: 0, max: 100 },
  operationalReadiness:  { type: Number, min: 0, max: 100 },
  confidence:            { type: Number, min: 0, max: 100 },
  overallScore:          { type: Number, min: 0, max: 100 },
  recommendation:        { type: String, default: '' },
  evaluationNotes:       { type: String, default: '' },
  evaluatedBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  evaluatedAt:           { type: Date },
}, { _id: false });

const userSchema = new mongoose.Schema({
  // ── Core ──────────────────────────────────────────────────────────────────
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ['admin', 'trainer', 'trainee', 'hr'], default: 'trainee' },
  isActive: { type: Boolean, default: true },

  // ── Profile ───────────────────────────────────────────────────────────────
  phone:          { type: String, default: '' },
  bio:            { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  linkedIn:       { type: String, default: '' },
  github:         { type: String, default: '' },

  // ── Trainee-specific ──────────────────────────────────────────────────────
  batchId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  enrolledAt:         { type: Date },
  skills:             [{ type: String }],
  placementStatus:    {
    type:    String,
    enum:    ['enrolled', 'training', 'ready', 'interview_scheduled', 'interview_done', 'offer_extended', 'placed', 'not_placed'],
    default: 'enrolled',
  },
  placementNote:      { type: String, default: '' },
  companyName:        { type: String, default: '' },
  ctc:                { type: String, default: '' },
  placementUpdatedAt: { type: Date },
  hrEvaluation:       hrEvaluationSchema,

  // ── Trainer-specific ──────────────────────────────────────────────────────
  expertise: [{ type: String }],

  // ── Auth fields (select: false — never leaked) ────────────────────────────
  sessionToken:          { type: String, select: false },
  refreshToken:          { type: String, select: false },
  lastLoginAt:           { type: Date },
  passwordResetToken:    { type: String, select: false },
  passwordResetExpires:  { type: Date,   select: false },
  passwordResetAttempts: { type: Number, default: 0, select: false },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ batchId: 1 });
userSchema.index({ placementStatus: 1 });

// ── Hash password before save ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Methods ───────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.createPasswordResetOtp = async function () {
  const otp  = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const salt = await bcrypt.genSalt(10);
  this.passwordResetToken    = await bcrypt.hash(otp, salt);
  this.passwordResetExpires  = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  this.passwordResetAttempts = 0;
  return otp;
};

userSchema.methods.verifyPasswordResetOtp = async function (submitted) {
  if (!this.passwordResetToken || !this.passwordResetExpires) return 'invalid';
  if (new Date() > this.passwordResetExpires) {
    this.passwordResetToken = this.passwordResetExpires = undefined;
    this.passwordResetAttempts = 0;
    return 'expired';
  }
  if (this.passwordResetAttempts >= 5) {
    this.passwordResetToken = this.passwordResetExpires = undefined;
    this.passwordResetAttempts = 0;
    return 'max_attempts';
  }
  const match = await bcrypt.compare(submitted, this.passwordResetToken);
  if (!match) { this.passwordResetAttempts += 1; return 'invalid'; }
  return 'valid';
};

userSchema.methods.clearPasswordResetOtp = function () {
  this.passwordResetToken = this.passwordResetExpires = undefined;
  this.passwordResetAttempts = 0;
};

// Safe public subset — never expose password / tokens
userSchema.methods.toPublic = function () {
  const o = this.toObject();
  delete o.password; delete o.sessionToken; delete o.refreshToken;
  delete o.passwordResetToken; delete o.passwordResetExpires;
  delete o.passwordResetAttempts; delete o.__v;
  return o;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
