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
  const { userId, score, review = '', claimRequestId } = req.body;
  if (!userId || !score) throw new AppError('User and score are required', 400);
  if (userId === req.user._id.toString()) throw new AppError('You cannot review yourself', 400);

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError('User not found', 404);

  const existing = targetUser.ratingsReceived.find(
    (rating) =>
      rating.by.toString() === req.user._id.toString() &&
      String(rating.claimRequest || '') === String(claimRequestId || '')
  );

  if (existing) throw new AppError('You have already reviewed this user for this claim', 400);

  targetUser.ratingsReceived.push({
    by: req.user._id,
    score,
    review,
    claimRequest: claimRequestId || null,
  });

  const total = targetUser.ratingsReceived.reduce((sum, rating) => sum + rating.score, 0);
  targetUser.averageRating = Number((total / targetUser.ratingsReceived.length).toFixed(1));
  await targetUser.save();

  res.status(201).json({ success: true, user: targetUser });
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