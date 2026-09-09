const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, sendTokenResponse, AppError } = require('../utils/helpers');

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, studentId } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const user = await User.create({ name, email, password, studentId });
  sendTokenResponse(user, 201, res);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.isBanned) {
    throw new AppError('Your account has been banned', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  user.password = undefined;
  sendTokenResponse(user, 200, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, studentId, avatar } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (studentId !== undefined) updates.studentId = studentId;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user });
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { user: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('relatedItem', 'title type images')
      .populate('relatedUser', 'name avatar'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.status(200).json({ success: true, notification });
});

exports.markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});