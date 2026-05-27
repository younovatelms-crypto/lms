// src/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const hrEvaluationSchema = new mongoose.Schema({
  communication:   { type: Number, min: 0, max: 100 },
  technical:       { type: Number, min: 0, max: 100 },
  confidence:      { type: Number, min: 0, max: 100 },
  overallScore:    { type: Number, min: 0, max: 100 },
  recommendation:  { type: String, default: '' },
  evaluationNotes: { type: String, default: '' },
  evaluatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  evaluatedAt:     { type: Date },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ['admin', 'trainer', 'trainee', 'hr'], default: 'trainee' },
    isActive: { type: Boolean, default: true },

    // ── Profile ──────────────────────────────────────────────────────────────
    phone:          { type: String, default: '' },
    bio:            { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    linkedIn:       { type: String, default: '' },
    github:         { type: String, default: '' },

    // ── Trainee-specific ─────────────────────────────────────────────────────
    batchId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    enrolledAt:         { type: Date },
    skills:             [{ type: String }],
    placementStatus:    {
      type:    String,
      enum:    ['enrolled', 'training', 'ready', 'interview_scheduled', 'placed', 'not_placed'],
      default: 'enrolled',
    },
    placementNote:      { type: String, default: '' },
    companyName:        { type: String, default: '' },
    ctc:                { type: String, default: '' },
    placementUpdatedAt: { type: Date },
    hrEvaluation:       hrEvaluationSchema,

    // ── Trainer-specific ─────────────────────────────────────────────────────
    expertise: [{ type: String }],

    // ── Auth (select: false — never leak in normal queries) ──────────────────
    sessionToken: { type: String, select: false },
    lastLoginAt:  { type: Date },
    refreshToken: { type: String, select: false },

    // ── Password reset (OTP-based) ───────────────────────────────────────────
    // passwordResetToken  → bcrypt hash of the 6-digit OTP (never store raw OTP)
    // passwordResetExpires → TTL timestamp — OTP invalid after this date
    // passwordResetAttempts → rate-limit brute-force OTP guessing (max 5)
    passwordResetToken:    { type: String, select: false },
    passwordResetExpires:  { type: Date,   select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ batchId: 1 });

// ── Hash password before save ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance: compare plain password against stored hash ──────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance: generate OTP, hash & set on document ───────────────────────────
// Returns the PLAIN otp (to send in email) — the hash is saved to the doc.
// Call await user.save() after this.
userSchema.methods.createPasswordResetOtp = async function () {
  // Cryptographically random 6-digit OTP (uniform distribution)
  const otp  = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const salt = await bcrypt.genSalt(10);

  this.passwordResetToken    = await bcrypt.hash(otp, salt);
  this.passwordResetExpires  = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
  this.passwordResetAttempts = 0;

  return otp; // caller sends this via email
};

// ── Instance: verify submitted OTP against stored hash ───────────────────────
// Returns 'valid' | 'expired' | 'invalid' | 'max_attempts'
userSchema.methods.verifyPasswordResetOtp = async function (submittedOtp) {
  // No OTP was ever set
  if (!this.passwordResetToken || !this.passwordResetExpires) {
    return 'invalid';
  }

  // TTL check
  if (new Date() > this.passwordResetExpires) {
    this.passwordResetToken    = undefined;
    this.passwordResetExpires  = undefined;
    this.passwordResetAttempts = 0;
    return 'expired';
  }

  // Brute-force guard — max 5 wrong attempts
  if (this.passwordResetAttempts >= 5) {
    this.passwordResetToken    = undefined;
    this.passwordResetExpires  = undefined;
    this.passwordResetAttempts = 0;
    return 'max_attempts';
  }

  const isMatch = await bcrypt.compare(submittedOtp, this.passwordResetToken);

  if (!isMatch) {
    this.passwordResetAttempts += 1;
    return 'invalid';
  }

  // Valid — do NOT clear fields yet; resetPassword controller will do that
  return 'valid';
};

// ── Instance: clear all OTP fields (call after successful password reset) ─────
userSchema.methods.clearPasswordResetOtp = function () {
  this.passwordResetToken    = undefined;
  this.passwordResetExpires  = undefined;
  this.passwordResetAttempts = 0;
};

// ── Instance: safe public subset returned to clients ─────────────────────────
userSchema.methods.toPublic = function () {
  return {
    _id:              this._id,
    name:             this.name,
    email:            this.email,
    role:             this.role,
    isActive:         this.isActive,
    phone:            this.phone,
    bio:              this.bio,
    profilePicture:   this.profilePicture,
    linkedIn:         this.linkedIn,
    github:           this.github,
    batchId:          this.batchId,
    enrolledAt:       this.enrolledAt,
    skills:           this.skills,
    placementStatus:  this.placementStatus,
    placementNote:    this.placementNote,
    companyName:      this.companyName,
    ctc:              this.ctc,
    expertise:        this.expertise,
    hrEvaluation:     this.hrEvaluation,
    lastLoginAt:      this.lastLoginAt,
    createdAt:        this.createdAt,
    updatedAt:        this.updatedAt,
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);