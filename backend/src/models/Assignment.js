// src/models/Assignment.js
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  trainee:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionUrl: { type: String, required: true },
  notes:         { type: String, default: '' },
  submittedAt:   { type: Date,   default: Date.now },
  status:        { type: String, enum: ['submitted', 'graded', 'resubmitted'], default: 'submitted' },
  grade:         { type: Number, min: 0 },
  feedback:      { type: String, default: '' },
  gradedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt:      { type: Date },
  allowResubmit: { type: Boolean, default: false },
}, { timestamps: false });

const assignmentSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true },
    description:   { type: String, default: '' },
    instructions:  { type: String, default: '' },
    batchId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    dueDate:       { type: Date,   required: true },
    maxScore:      { type: Number, default: 100 },
    attachmentUrl: { type: String, default: '' },
    status:        { type: String, enum: ['active', 'closed', 'draft'], default: 'active' },
    submissions:   [submissionSchema],
  },
  { timestamps: true }
);

assignmentSchema.index({ batchId: 1, status: 1 });
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
