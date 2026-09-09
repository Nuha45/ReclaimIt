const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'electronics',
        'clothing',
        'accessories',
        'books',
        'documents',
        'keys',
        'bags',
        'sports',
        'other',
      ],
    },
    type: {
      type: String,
      required: [true, 'Item type is required'],
      enum: ['lost', 'found'],
    },
    status: {
      type: String,
      enum: ['active', 'claimed', 'resolved', 'removed'],
      default: 'active',
    },
    location: {
      name: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
      },
      building: { type: String, trim: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    dateLostFound: {
      type: Date,
      required: [true, 'Date lost/found is required'],
    },
    color: {
      type: String,
      trim: true,
      maxlength: [50, 'Color cannot exceed 50 characters'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [80, 'Brand cannot exceed 80 characters'],
    },
    size: {
      type: String,
      trim: true,
      maxlength: [50, 'Size cannot exceed 50 characters'],
    },
    condition: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair', 'poor'],
      default: 'good',
    },
    uniqueMarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Unique marks cannot exceed 1000 characters'],
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemPhoto',
      },
    ],
    verificationQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationQuestion',
      },
    ],
    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagCount: {
      type: Number,
      default: 0,
    },
    claimCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

itemSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text',
  color: 'text',
  brand: 'text',
  uniqueMarks: 'text',
});
itemSchema.index({ category: 1, type: 1, status: 1 });
itemSchema.index({ 'location.name': 1 });
itemSchema.index({ dateLostFound: -1 });
itemSchema.index({ postedBy: 1 });
itemSchema.index({ brand: 1, color: 1, size: 1, condition: 1 });

module.exports = mongoose.model('Item', itemSchema);
