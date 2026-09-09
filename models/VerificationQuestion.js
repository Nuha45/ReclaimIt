const mongoose = require('mongoose');

const verificationQuestionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [200, 'Question cannot exceed 200 characters'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      maxlength: [200, 'Answer cannot exceed 200 characters'],
      select: false,
    },
    isSensitive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

verificationQuestionSchema.index({ item: 1 });

module.exports = mongoose.model('VerificationQuestion', verificationQuestionSchema);
