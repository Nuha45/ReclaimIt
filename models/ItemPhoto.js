const mongoose = require('mongoose');

const itemPhotoSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [150, 'Caption cannot exceed 150 characters'],
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

itemPhotoSchema.index({ item: 1, createdAt: -1 });

module.exports = mongoose.model('ItemPhoto', itemPhotoSchema);
