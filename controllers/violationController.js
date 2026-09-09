const Violation = require('../models/Violation');
const User = require('../models/User');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');

const VIOLATION_BAN_THRESHOLD = 3;

exports.reportViolation = asyncHandler(async (req, res) => {
  const { reportedUserId, itemId, reason, description } = req.body;

  if (reportedUserId === req.user._id.toString()) {
    throw new AppError('You cannot report yourself', 400);
  }

  const reportedUser = await User.findById(reportedUserId);
  if (!reportedUser) {
    throw new AppError('Reported user not found', 404);
  }

  if (itemId) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404);
    }

    await Item.findByIdAndUpdate(itemId, {
      $inc: { flagCount: 1 },
      isFlagged: true,
    });
  }

  const existingReport = await Violation.findOne({
    reportedBy: req.user._id,
    reportedUser: reportedUserId,
    item: itemId || null,
    status: 'pending',
  });

  if (existingReport) {
    throw new AppError('You have already reported this', 400);
  }

  const violation = await Violation.create({
    reportedBy: req.user._id,
    reportedUser: reportedUserId,
    item: itemId || null,
    reason,
    description,
  });

  const populated = await Violation.findById(violation._id)
    .populate('reportedBy reportedUser', 'name email')
    .populate('item', 'title type');

  res.status(201).json({
    success: true,
    message: 'Violation reported successfully. It will be reviewed by an admin.',
    violation: populated,
  });
});

exports.getMyReports = asyncHandler(async (req, res) => {
  const violations = await Violation.find({ reportedBy: req.user._id })
    .populate('reportedUser', 'name email')
    .populate('item', 'title type')
    .sort('-createdAt');

  res.status(200).json({ success: true, violations });
});

exports.getViolationsAgainstMe = asyncHandler(async (req, res) => {
  const violations = await Violation.find({
    reportedUser: req.user._id,
    status: { $in: ['confirmed', 'reviewed'] },
  })
    .populate('reportedBy', 'name')
    .populate('item', 'title type')
    .sort('-createdAt');

  res.status(200).json({ success: true, violations });
});

exports.autoProcessViolation = async (reportedUserId) => {
  const confirmedCount = await Violation.countDocuments({
    reportedUser: reportedUserId,
    status: 'confirmed',
  });

  const user = await User.findById(reportedUserId);
  if (!user) return;

  user.violationCount = confirmedCount;

  if (confirmedCount >= VIOLATION_BAN_THRESHOLD) {
    user.isBanned = true;
    await createNotification(Notification, {
      user: user._id,
      type: 'account_banned',
      title: 'Account Banned',
      message: `Your account has been automatically banned due to ${confirmedCount} confirmed violations.`,
    });
  }

  await user.save();
};

module.exports.VIOLATION_BAN_THRESHOLD = VIOLATION_BAN_THRESHOLD;
