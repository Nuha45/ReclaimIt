const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Violation reason is required'],
      enum: [
        'fraudulent_post',
        'misleading_info',
        'harassment',
        'spam',
        'inappropriate_content',
        'other',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'confirmed'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

violationSchema.index({ reportedUser: 1, status: 1 });
violationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Violation', violationSchema);
