const Item = require('../models/Item');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { extractKeywords, findMatchingItems, createNotification } = require('../utils/matching');

exports.createItem = asyncHandler(async (req, res) => {
  const { title, description, category, type, location, dateLostFound } = req.body;

  let parsedLocation = location;
  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      throw new AppError('Invalid location format', 400);
    }
  }

  const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  const keywords = extractKeywords(`${title} ${description}`);

  const item = await Item.create({
    title,
    description,
    category,
    type,
    location: parsedLocation,
    dateLostFound,
    images,
    keywords,
    postedBy: req.user._id,
  });

  const populated = await Item.findById(item._id).populate('postedBy', 'name email avatar');

  const matches = await findMatchingItems(populated, Item, 5);
  for (const match of matches) {
    if (match.matchScore >= 50) {
      await createNotification(Notification, {
        user: match.postedBy._id,
        type: 'match_found',
        title: 'Potential Match Found',
        message: `A ${type === 'lost' ? 'found' : 'lost'} item "${populated.title}" may match your post "${match.title}" (${match.matchScore}% match).`,
        relatedItem: populated._id,
        relatedUser: req.user._id,
      });
    }
  }

  res.status(201).json({
    success: true,
    item: populated,
    suggestedMatches: matches,
  });
});

exports.getItems = asyncHandler(async (req, res) => {
  const {
    category,
    type,
    status,
    location,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 12,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (type) filter.type = type;
  if (status) filter.status = status;
  else filter.status = 'active';

  if (location) {
    filter['location.name'] = { $regex: location, $options: 'i' };
  }

  if (startDate || endDate) {
    filter.dateLostFound = {};
    if (startDate) filter.dateLostFound.$gte = new Date(startDate);
    if (endDate) filter.dateLostFound.$lte = new Date(endDate);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate('postedBy', 'name email avatar')
      .sort(sort)
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

exports.getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate(
    'postedBy',
    'name email avatar studentId'
  );

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  res.status(200).json({ success: true, item });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this item', 403);
  }

  const allowedFields = ['title', 'description', 'category', 'location', 'dateLostFound', 'status'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = field === 'location' && typeof req.body[field] === 'string'
        ? JSON.parse(req.body[field])
        : req.body[field];
    }
  }

  if (updates.title || updates.description) {
    updates.keywords = extractKeywords(
      `${updates.title || item.title} ${updates.description || item.description}`
    );
  }

  if (req.files?.length) {
    updates.images = [
      ...item.images,
      ...req.files.map((f) => `/uploads/${f.filename}`),
    ];
  }

  const updated = await Item.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('postedBy', 'name email avatar');

  res.status(200).json({ success: true, item: updated });
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this item', 403);
  }

  await Item.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, message: 'Item deleted successfully' });
});

exports.getMyItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ postedBy: req.user._id })
    .sort('-createdAt')
    .populate('postedBy', 'name email avatar');

  res.status(200).json({ success: true, items });
});

exports.claimItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (item.status !== 'active') {
    throw new AppError('This item is no longer available', 400);
  }

  if (item.postedBy.toString() === req.user._id.toString()) {
    throw new AppError('You cannot claim your own item', 400);
  }

  item.status = 'claimed';
  item.claimedBy = req.user._id;
  await item.save();

  await createNotification(Notification, {
    user: item.postedBy,
    type: 'item_claimed',
    title: 'Item Claim Request',
    message: `${req.user.name} has claimed your item "${item.title}".`,
    relatedItem: item._id,
    relatedUser: req.user._id,
  });

  const populated = await Item.findById(item._id).populate('postedBy claimedBy', 'name email avatar');

  res.status(200).json({ success: true, item: populated });
});

exports.resolveItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (item.postedBy.toString() !== req.user._id.toString()) {
    throw new AppError('Only the poster can resolve this item', 403);
  }

  item.status = 'resolved';
  await item.save();

  if (item.claimedBy) {
    await createNotification(Notification, {
      user: item.claimedBy,
      type: 'item_resolved',
      title: 'Item Resolved',
      message: `The item "${item.title}" has been marked as resolved.`,
      relatedItem: item._id,
    });
  }

  res.status(200).json({ success: true, item });
});

exports.getMatches = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).lean();

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  const matches = await findMatchingItems(item, Item, parseInt(req.query.limit, 10) || 10);

  res.status(200).json({ success: true, matches });
});
