// src/models/CourseSubscription.js
// ─────────────────────────────────────────────────────────────────────────────
// Tracks a Trainee's paid subscription to a Course.
// References: User (trainee), Course
//
// IMPORTANT: This model must be imported in server.js BEFORE connectDB()
// so Mongoose registers it and MongoDB creates the collection on first use.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseSubscriptionSchema = new Schema(
  {
    // ── Who ────────────────────────────────────────────────────────────────
    trainee: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'trainee is required'],
      index:    true,
    },

    // ── What course ────────────────────────────────────────────────────────
    course: {
      type:     Schema.Types.ObjectId,
      ref:      'Course',
      required: [true, 'course is required'],
      index:    true,
    },

    // ── Subscription plan ──────────────────────────────────────────────────
    // 'full'    = one-time full purchase
    // 'monthly' = recurring monthly
    // 'trial'   = free trial
    // 'admin'   = manually assigned by admin (no payment)
    plan: {
      type:    String,
      enum:    ['full', 'monthly', 'trial', 'admin'],
      default: 'full',
    },

    // ── Subscription lifecycle ─────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['pending', 'active', 'expired', 'cancelled', 'failed'],
      default: 'pending',
    },

    // null startDate = not yet activated
    // null endDate   = lifetime access
    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },

    // ── Payment details ────────────────────────────────────────────────────
    payment: {
      amount:   { type: Number, default: 0, min: 0 }, // paise for INR
      currency: { type: String, default: 'INR', trim: true },

      // Razorpay
      razorpayOrderId:   { type: String, default: '', trim: true },
      razorpayPaymentId: { type: String, default: '', trim: true },
      razorpaySignature: { type: String, default: '', trim: true },

      // Generic
      transactionId: { type: String, default: '', trim: true },
      gateway: {
        type:    String,
        enum:    ['razorpay', 'manual', 'free', ''],
        default: '',
      },

      paidAt:        { type: Date,   default: null },
      failureReason: { type: String, default: '' },
    },

    // ── Admin metadata ─────────────────────────────────────────────────────
    activatedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    cancelledBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    cancelledAt: { type: Date,   default: null },
    notes:       { type: String, default: '' },
  },
  {
    // ✅ Explicit collection name — prevents Mongoose pluralisation issues
    collection: 'coursesubscriptions',
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// ✅ unique: true — one subscription record per (trainee + course) pair
courseSubscriptionSchema.index(
  { trainee: 1, course: 1 },
  { unique: true, name: 'trainee_course_unique' }
);
courseSubscriptionSchema.index({ status: 1 });
courseSubscriptionSchema.index({ 'payment.razorpayOrderId': 1 });
courseSubscriptionSchema.index({ createdAt: -1 });

// ── Virtual: isActive ──────────────────────────────────────────────────────
// true  → status is 'active' AND (no endDate OR endDate is in the future)
// false → anything else
courseSubscriptionSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (!this.endDate)            return true;       // lifetime access
  return new Date() < new Date(this.endDate);
});

courseSubscriptionSchema.set('toJSON',   { virtuals: true });
courseSubscriptionSchema.set('toObject', { virtuals: true });

// ── ✅ Guard against duplicate model registration (hot-reload safe) ─────────
const CourseSubscription =
  mongoose.models.CourseSubscription ||
  mongoose.model('CourseSubscription', courseSubscriptionSchema);

module.exports = CourseSubscription;