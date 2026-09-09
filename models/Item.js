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
    images: [
      {
        type: String,
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
  },
  { timestamps: true }
);

itemSchema.index({ title: 'text', description: 'text', keywords: 'text' });
itemSchema.index({ category: 1, type: 1, status: 1 });
itemSchema.index({ 'location.name': 1 });
itemSchema.index({ dateLostFound: -1 });
itemSchema.index({ postedBy: 1 });

module.exports = mongoose.model('Item', itemSchema);
