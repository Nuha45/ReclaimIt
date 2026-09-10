const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');
const { sendNewMessageEmail } = require('../utils/emailService');

exports.sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, itemId } = req.body;

  if (receiverId === req.user._id.toString()) {
    throw new AppError('You cannot message yourself', 400);
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new AppError('Receiver not found', 404);
  }

  if (receiver.isBanned) {
    throw new AppError('Cannot message this user', 400);
  }

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content,
    item: itemId || null,
  });

  const populated = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('item', 'title type images');

  await createNotification(Notification, {
    user: receiverId,
    type: 'new_message',
    title: 'New Message',
    message: `${req.user.name} sent you a message.`,
    relatedUser: req.user._id,
    relatedItem: itemId || null,
  });

  // Email the recipient when a new chat message arrives
  sendNewMessageEmail({
    recipient: receiver,
    senderName: req.user.name,
    preview: content,
    itemId,
  }).catch(() => {});

  res.status(201).json({ success: true, message: populated });
});

exports.getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userId] },
            '$receiver',
            '$sender',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userId] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'participant',
      },
    },
    { $unwind: '$participant' },
    {
      $project: {
        participant: { _id: 1, name: 1, avatar: 1, email: 1 },
        lastMessage: 1,
        unreadCount: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, conversations });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const filter = {
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .populate('item', 'title type images')
      .sort('createdAt')
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Message.countDocuments(filter),
  ]);

  await Message.updateMany(
    { sender: userId, receiver: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    messages,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findOneAndUpdate(
    { _id: req.params.id, receiver: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  res.status(200).json({ success: true, message });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    receiver: req.user._id,
    isRead: false,
  });

  res.status(200).json({ success: true, unreadCount: count });
});
