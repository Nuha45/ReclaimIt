const User = require('../models/User');
const Item = require('../models/Item');
const Violation = require('../models/Violation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');

const VIOLATION_BAN_THRESHOLD = 3;

exports.getDashboard = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    totalItems,
    activeItems,
    pendingViolations,
    bannedUsers,
    recentItems,
    recentViolations,
  ] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Item.countDocuments({ status: 'active' }),
    Violation.countDocuments({ status: 'pending' }),
    User.countDocuments({ isBanned: true }),
    Item.find().sort('-createdAt').limit(10).populate('postedBy', 'name email'),
    Violation.find({ status: 'pending' })
      .sort('-createdAt')
      .limit(10)
      .populate('reportedBy reportedUser', 'name email')
      .populate('item', 'title type'),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalItems,
      activeItems,
      pendingViolations,
      bannedUsers,
    },
    recentItems,
    recentViolations,
  });
});

exports.getAllItems = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate('postedBy', 'name email avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Item.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    items,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  item.status = 'removed';
  await item.save();

  await createNotification(Notification, {
    user: item.postedBy,
    type: 'admin_action',
    title: 'Item Removed',
    message: `Your item "${item.title}" was removed by an administrator.`,
    relatedItem: item._id,
  });

  res.status(200).json({ success: true, message: 'Item removed successfully' });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, banned } = req.query;
  const filter = {};
  if (banned === 'true') filter.isBanned = true;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit, 10)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

exports.banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Cannot ban an admin user', 400);
  }

  user.isBanned = true;
  await user.save();

  await createNotification(Notification, {
    user: user._id,
    type: 'account_banned',
    title: 'Account Banned',
    message: 'Your account has been banned by an administrator.',
  });

  res.status(200).json({ success: true, message: 'User banned successfully', user });
});

exports.unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isBanned = false;
  user.violationCount = 0;
  await user.save();

  res.status(200).json({ success: true, message: 'User unbanned successfully', user });
});

exports.reviewViolation = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const violation = await Violation.findById(req.params.id);

  if (!violation) {
    throw new AppError('Violation not found', 404);
  }

  violation.status = status;
  violation.adminNotes = adminNotes;
  violation.reviewedBy = req.user._id;
  violation.reviewedAt = new Date();
  await violation.save();

  if (status === 'confirmed') {
    const reportedUser = await User.findById(violation.reportedUser);
    reportedUser.violationCount += 1;

    await createNotification(Notification, {
      user: reportedUser._id,
      type: 'violation_warning',
      title: 'Violation Confirmed',
      message: `A violation report against you has been confirmed. Total violations: ${reportedUser.violationCount}.`,
      relatedItem: violation.item,
    });

    if (reportedUser.violationCount >= VIOLATION_BAN_THRESHOLD) {
      reportedUser.isBanned = true;
      await createNotification(Notification, {
        user: reportedUser._id,
        type: 'account_banned',
        title: 'Account Banned',
        message: `Your account has been banned due to ${reportedUser.violationCount} confirmed violations.`,
      });
    }

    await reportedUser.save();

    if (violation.item) {
      await Item.findByIdAndUpdate(violation.item, {
        isFlagged: true,
        $inc: { flagCount: 1 },
        status: 'removed',
      });
    }
  }

  const populated = await Violation.findById(violation._id)
    .populate('reportedBy reportedUser reviewedBy', 'name email')
    .populate('item', 'title type');

  res.status(200).json({ success: true, violation: populated });
});

exports.getAllViolations = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [violations, total] = await Promise.all([
    Violation.find(filter)
      .populate('reportedBy reportedUser reviewedBy', 'name email')
      .populate('item', 'title type images')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Violation.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    violations,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

exports.generateReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};

  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const [
    itemsByCategory,
    itemsByType,
    itemsByStatus,
    violationStats,
    userGrowth,
    totalMessages,
  ] = await Promise.all([
    Item.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Item.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Item.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Violation.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Message.countDocuments(dateFilter),
  ]);

  res.status(200).json({
    success: true,
    report: {
      generatedAt: new Date(),
      period: { startDate, endDate },
      itemsByCategory,
      itemsByType,
      itemsByStatus,
      violationStats,
      userGrowth,
      totalMessages,
    },
  });
});

exports.promoteToAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.role = 'admin';
  await user.save();

  res.status(200).json({ success: true, message: 'User promoted to admin', user });
});
