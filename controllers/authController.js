const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, sendTokenResponse, AppError } = require('../utils/helpers');
const { presentNotification } = require('../utils/itemTerminology');
const { sendPasswordResetEmail } = require('../utils/emailService');

const FORGOT_PASSWORD_MESSAGE =
  'If an account exists with that email, a password reset link has been sent.';

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getResetTokenExpiryMs() {
  const minutes = Number(process.env.PASSWORD_RESET_EXPIRE_MINUTES || 60);
  return minutes * 60 * 1000;
}

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, studentId } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const user = await User.create({ name, email, password, studentId });
  sendTokenResponse(user, 201, res);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();

  if (!email) {
    throw new AppError('Please provide a valid email', 400);
  }

  const user = await User.findOne({ email });

  if (user && !user.isBanned) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + getResetTokenExpiryMs());
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail({ user, resetToken });
  }

  res.status(200).json({
    success: true,
    message: FORGOT_PASSWORD_MESSAGE,
  });
});

exports.validateResetToken = asyncHandler(async (req, res) => {
  const rawToken = String(req.params.token || '').trim();
  if (!rawToken) {
    return res.status(200).json({ success: true, valid: false });
  }

  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(rawToken),
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetTokenHash');

  res.status(200).json({ success: true, valid: Boolean(user) });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const rawToken = String(req.body.token || '').trim();
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (!rawToken) {
    throw new AppError('Invalid or expired reset link', 400);
  }

  if (!password || String(password).length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(rawToken),
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password +passwordResetTokenHash');

  if (!user) {
    throw new AppError('Invalid or expired reset link', 400);
  }

  if (user.isBanned) {
    throw new AppError('Your account has been banned', 403);
  }

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. You can sign in with your new password.',
  });
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

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError('Current password, new password, and confirmation are required', 400);
  }

  if (String(newPassword).length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError('New passwords do not match', 400);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
  });
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

exports.getSavedItems = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedItems',
    populate: [
      { path: 'postedBy', select: 'name email avatar averageRating' },
      { path: 'photos' },
      { path: 'verificationQuestions', select: 'question isSensitive' },
    ],
  });

  res.status(200).json({ success: true, items: user.savedItems || [] });
});

exports.toggleSavedItem = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) throw new AppError('Item ID is required', 400);

  const user = await User.findById(req.user._id);
  const existingIndex = user.savedItems.findIndex((id) => id.toString() === itemId);

  if (existingIndex >= 0) {
    user.savedItems.splice(existingIndex, 1);
  } else {
    user.savedItems.unshift(itemId);
  }

  await user.save();

  const populated = await User.findById(req.user._id).populate({
    path: 'savedItems',
    populate: { path: 'postedBy', select: 'name email avatar averageRating' },
  });

  res.status(200).json({
    success: true,
    isSaved: existingIndex < 0,
    items: populated.savedItems,
  });
});

exports.getSearchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('recentSearches');
  res.status(200).json({ success: true, searches: user.recentSearches || [] });
});

exports.saveSearch = asyncHandler(async (req, res) => {
  const { query = '', filters = {} } = req.body;
  const user = await User.findById(req.user._id);

  user.recentSearches.unshift({
    query: String(query).trim(),
    filters,
    createdAt: new Date(),
  });
  user.recentSearches = user.recentSearches.slice(0, 8);
  await user.save();

  res.status(201).json({ success: true, searches: user.recentSearches });
});

exports.addReview = asyncHandler(async (req, res) => {
  // Back-compat wrapper — prefer POST /api/reviews
  req.body.revieweeId = req.body.revieweeId || req.body.userId;
  req.body.rating = req.body.rating || req.body.score;
  req.body.comment = req.body.comment ?? req.body.review ?? '';
  const reviewController = require('./reviewController');
  return reviewController.createReview(req, res);
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
    notifications: notifications.map((n) => presentNotification(n.toObject())),
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