const mongoose = require('mongoose');

const verificationAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationQuestion',
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Answer cannot exceed 200 characters'],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const claimRequestSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claimer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending',
    },
    verificationAnswers: [verificationAnswerSchema],
    verificationScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    claimerMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      default: '',
    },
    ownerNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    reviewedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

claimRequestSchema.index({ item: 1, createdAt: -1 });
claimRequestSchema.index({ owner: 1, status: 1 });
claimRequestSchema.index({ claimer: 1, status: 1 });

module.exports = mongoose.model('ClaimRequest', claimRequestSchema);
