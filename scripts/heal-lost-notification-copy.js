/**
 * One-time heal: rewrite stored notification title/message for LOST items
 * that still use claim wording. Does not delete data.
 */
require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Item');
require('../models/User');
const Notification = require('../models/Notification');
const { presentNotification } = require('../utils/itemTerminology');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const notes = await Notification.find({})
    .populate('relatedItem', 'title type')
    .populate('relatedUser', 'name');

  let updated = 0;
  for (const note of notes) {
    const presented = presentNotification(note.toObject());
    if (
      presented.title !== note.title ||
      presented.message !== note.message
    ) {
      note.title = presented.title;
      note.message = presented.message;
      await note.save();
      updated += 1;
    }
  }

  console.log(`Healed ${updated} of ${notes.length} notifications`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
