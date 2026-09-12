const Item = require('../models/Item');
const ItemPhoto = require('../models/ItemPhoto');
const VerificationQuestion = require('../models/VerificationQuestion');
const ClaimRequest = require('../models/ClaimRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../utils/helpers');
const { extractKeywords, findMatchingItems, createNotification } = require('../utils/matching');
const { generateItemQrPngBuffer, generateItemFlyerSvg } = require('../utils/qrcode');
const { saveUploadedImages, cleanupLocalUploads } = require('../utils/storage');
const { sendClaimReceivedEmail } = require('../utils/emailService');
const {
  receivedForPoster,
  submittedForActor,
} = require('../utils/itemTerminology');

const ITEM_POPULATE = [
  { path: 'postedBy', select: 'name email avatar studentId averageRating' },
  { path: 'claimedBy', select: 'name email avatar averageRating' },
  { path: 'photos' },
  { path: 'verificationQuestions', select: 'question isSensitive' },
];

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function hydrateItem(itemId) {
  return Item.findById(itemId).populate(ITEM_POPULATE);
}

/** Fix legacy rows marked claimed before owner acceptance */
async function healClaimStatus(item) {
  if (!item) return item;
  if (item.status === 'claimed' && !item.claimedBy) {
    const accepted = await ClaimRequest.findOne({ item: item._id, status: { $in: ['accepted', 'completed'] } });
    if (accepted) {
      item.claimedBy = accepted.claimer;
      await item.save();
    } else {
      item.status = 'active';
      await item.save();
    }
  }
  return item;
}

async function attachPendingClaims(items) {
  if (!items.length) return items;
  const ids = items.map((item) => item._id);
  const counts = await ClaimRequest.aggregate([
    { $match: { item: { $in: ids }, status: 'pending' } },
    { $group: { _id: '$item', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((row) => [row._id.toString(), row.count]));
  return items.map((item) => {
    const obj = item.toObject ? item.toObject() : { ...item };
    obj.pendingClaims = map[item._id.toString()] || 0;
    return obj;
  });
}

exports.createItem = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    type,
    location,
    dateLostFound,
    color,
    brand,
    size,
    condition,
    uniqueMarks,
    verificationQuestions,
  } = req.body;

  let parsedLocation = location;
  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      throw new AppError('Invalid location format', 400);
    }
  }

  let uploadedImagePaths = [];
  try {
    uploadedImagePaths = await saveUploadedImages(req.files);
  } catch (err) {
    cleanupLocalUploads(req.files);
    throw err;
  }

  const questionInput = parseJsonField(verificationQuestions, []);
  const keywords = extractKeywords(
    `${title} ${description} ${color || ''} ${brand || ''} ${uniqueMarks || ''}`
  );

  const item = await Item.create({
    title,
    description,
    category,
    type,
    location: parsedLocation,
    dateLostFound,
    color,
    brand,
    size,
    condition,
    uniqueMarks,
    images: uploadedImagePaths,
    keywords,
    postedBy: req.user._id,
  });

  const photos = uploadedImagePaths.length
    ? await ItemPhoto.insertMany(
        uploadedImagePaths.map((url, index) => ({
          item: item._id,
          url,
          isPrimary: index === 0,
        }))
      )
    : [];

  const sanitizedQuestions = Array.isArray(questionInput)
    ? questionInput
        .filter((q) => q && q.question && q.answer)
        .slice(0, 3)
        .map((q) => ({
          item: item._id,
          question: String(q.question).trim(),
          answer: String(q.answer).trim().toLowerCase(),
          isSensitive: true,
        }))
    : [];

  const createdQuestions = sanitizedQuestions.length
    ? await VerificationQuestion.insertMany(sanitizedQuestions)
    : [];

  item.photos = photos.map((photo) => photo._id);
  item.verificationQuestions = createdQuestions.map((question) => question._id);

  await item.save();

  const populated = await hydrateItem(item._id);
  const matches = await findMatchingItems(populated.toObject(), Item, 5);

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
    color,
    brand,
    size,
    condition,
    page = 1,
    limit = 12,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (type) filter.type = type;
  if (status) filter.status = status;
  else filter.status = { $in: ['active', 'claimed'] };

  if (location) {
    filter['location.name'] = { $regex: location, $options: 'i' };
  }

  if (color) filter.color = { $regex: color, $options: 'i' };
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  if (size) filter.size = { $regex: size, $options: 'i' };
  if (condition) filter.condition = condition;

  if (startDate || endDate) {
    filter.dateLostFound = {};
    if (startDate) filter.dateLostFound.$gte = new Date(startDate);
    if (endDate) filter.dateLostFound.$lte = new Date(endDate);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [rawItems, total] = await Promise.all([
    Item.find(filter)
      .populate(ITEM_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Item.countDocuments(filter),
  ]);

  // Heal legacy "claimed" without accepted claimer
  await Promise.all(rawItems.map((item) => healClaimStatus(item)));
  const items = await attachPendingClaims(rawItems);

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
  let item = await hydrateItem(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  item = await healClaimStatus(item);
  item = await hydrateItem(req.params.id);

  const pendingClaims = await ClaimRequest.countDocuments({ item: item._id, status: 'pending' });

  const claimRequests =
    req.user &&
    (item.postedBy._id.toString() === req.user._id.toString() ||
      item.claimedBy?._id?.toString() === req.user._id.toString() ||
      item.claimedBy?.toString?.() === req.user._id.toString())
      ? await ClaimRequest.find({ item: item._id })
          .populate('owner claimer', 'name email avatar averageRating')
          .sort('-createdAt')
      : [];

  const myClaim = req.user
    ? await ClaimRequest.findOne({ item: item._id, claimer: req.user._id })
        .populate('owner claimer', 'name email avatar averageRating')
        .sort('-createdAt')
    : null;

  res.status(200).json({
    success: true,
    item,
    claimRequests,
    pendingClaims,
    myClaim,
  });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this item', 403);
  }

  const updates = {};
  const allowedFields = [
    'title',
    'description',
    'category',
    'dateLostFound',
    'status',
    'color',
    'brand',
    'size',
    'condition',
    'uniqueMarks',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (req.body.location !== undefined) {
    updates.location = parseJsonField(req.body.location, item.location);
  }

  if (updates.title || updates.description || updates.color || updates.brand || updates.uniqueMarks) {
    updates.keywords = extractKeywords(
      `${updates.title || item.title} ${updates.description || item.description} ${updates.color || item.color || ''} ${updates.brand || item.brand || ''} ${updates.uniqueMarks || item.uniqueMarks || ''}`
    );
  }

  if (req.files?.length) {
    let newPaths;
    try {
      newPaths = await saveUploadedImages(req.files);
    } catch (err) {
      cleanupLocalUploads(req.files);
      throw err;
    }
    updates.images = [...item.images, ...newPaths];
    const createdPhotos = await ItemPhoto.insertMany(
      newPaths.map((url) => ({
        item: item._id,
        url,
      }))
    );
    updates.photos = [...(item.photos || []), ...createdPhotos.map((photo) => photo._id)];
  }

  if (req.body.verificationQuestions !== undefined) {
    const incomingQuestions = parseJsonField(req.body.verificationQuestions, []);
    await VerificationQuestion.deleteMany({ item: item._id });
    const createdQuestions = Array.isArray(incomingQuestions)
      ? await VerificationQuestion.insertMany(
          incomingQuestions
            .filter((q) => q && q.question && q.answer)
            .slice(0, 3)
            .map((q) => ({
              item: item._id,
              question: String(q.question).trim(),
              answer: String(q.answer).trim().toLowerCase(),
              isSensitive: true,
            }))
        )
      : [];
    updates.verificationQuestions = createdQuestions.map((question) => question._id);
  }

  const updated = await Item.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate(ITEM_POPULATE);

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
  const rawItems = await Item.find({ postedBy: req.user._id, status: { $ne: 'removed' } })
    .sort('-createdAt')
    .populate(ITEM_POPULATE);

  await Promise.all(rawItems.map((item) => healClaimStatus(item)));
  const items = await attachPendingClaims(rawItems);

  res.status(200).json({ success: true, items });
});

exports.claimItem = asyncHandler(async (req, res) => {
  let item = await Item.findById(req.params.id);

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  item = await healClaimStatus(item);

  if (item.status !== 'active') {
    throw new AppError(
      item.type === 'lost'
        ? 'This lost item is no longer open for found reports'
        : 'This found item is no longer open for new claims',
      400
    );
  }

  if (item.claimedBy) {
    throw new AppError(
      item.type === 'lost'
        ? 'A finder has already been accepted for this lost item'
        : 'This found item has already been claimed',
      400
    );
  }

  if (item.postedBy.toString() === req.user._id.toString()) {
    throw new AppError(
      item.type === 'lost'
        ? 'You cannot report finding your own lost item'
        : 'You cannot claim your own found item',
      400
    );
  }

  const claimerMessage = req.body.claimerMessage || '';
  const verificationAnswers = parseJsonField(req.body.verificationAnswers, []);
  const expectedQuestions = await VerificationQuestion.find({ item: item._id }).select('+answer');
  const existingPending = await ClaimRequest.findOne({
    item: item._id,
    claimer: req.user._id,
    status: 'pending',
  });

  if (existingPending) {
    throw new AppError(
      item.type === 'lost'
        ? 'You already have a pending found report for this item'
        : 'You already have a pending claim request for this item',
      400
    );
  }

  if (expectedQuestions.length > 0 && verificationAnswers.length < Math.min(2, expectedQuestions.length)) {
    throw new AppError(
      item.type === 'lost'
        ? 'Please answer the verification questions before submitting your found report'
        : 'Please answer the verification questions before claiming',
      400
    );
  }

  const normalizedAnswers = expectedQuestions.slice(0, 3).map((question) => {
    const submitted = verificationAnswers.find((answer) => answer.questionId === question._id.toString());
    const answerText = submitted?.answer ? String(submitted.answer).trim() : '';
    const isCorrect = answerText.toLowerCase() === question.answer.toLowerCase();

    return {
      questionId: question._id,
      question: question.question,
      answer: answerText,
      isCorrect,
    };
  });

  const verificationScore = normalizedAnswers.filter((answer) => answer.isCorrect).length;

  const claimRequest = await ClaimRequest.create({
    item: item._id,
    owner: item.postedBy,
    claimer: req.user._id,
    status: 'pending',
    verificationAnswers: normalizedAnswers,
    verificationScore,
    claimerMessage,
  });

  // Stay open (active) until the poster accepts
  item.claimCount += 1;
  await item.save();

  const toPoster = receivedForPoster({ item, actorName: req.user.name });
  const toActor = submittedForActor({ item });

  await createNotification(Notification, {
    user: item.postedBy,
    type: 'claim_received',
    title: toPoster.title,
    message: toPoster.message,
    relatedItem: item._id,
    relatedUser: req.user._id,
  });

  await createNotification(Notification, {
    user: req.user._id,
    type: 'item_claimed',
    title: toActor.title,
    message: toActor.message,
    relatedItem: item._id,
    relatedUser: item.postedBy,
  });

  const owner = await User.findById(item.postedBy).select('name email');
  if (owner?.email) {
    sendClaimReceivedEmail({
      owner,
      claimerName: req.user.name,
      item,
    }).catch(() => {});
  }

  const populated = await hydrateItem(item._id);

  res.status(201).json({ success: true, item: populated, claimRequest });
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
      title: 'Item returned',
      message: `"${item.title}" has been marked as returned.`,
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

exports.addItemPhotos = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) throw new AppError('Item not found', 404);
  if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this item', 403);
  }

  let newPaths = [];
  try {
    newPaths = await saveUploadedImages(req.files);
  } catch (err) {
    cleanupLocalUploads(req.files);
    throw err;
  }

  const photos = await ItemPhoto.insertMany(
    newPaths.map((url, index) => ({
      item: item._id,
      url,
      isPrimary: item.images.length === 0 && index === 0,
    }))
  );

  item.images = [...item.images, ...newPaths];
  item.photos = [...(item.photos || []), ...photos.map((photo) => photo._id)];
  await item.save();

  res.status(201).json({ success: true, item: await hydrateItem(item._id) });
});

/** Download QR PNG for a lost item (generated in memory; no disk file required). */
exports.getItemQr = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  if (item.type !== 'lost') {
    throw new AppError('QR codes are only generated for lost items', 400);
  }

  const png = await generateItemQrPngBuffer(item._id);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="reclaimit-${item._id}-qr.png"`
  );
  res.send(png);
});

/** Downloadable printable flyer (SVG) with embedded QR */
exports.getItemFlyer = asyncHandler(async (req, res) => {
  let item = await Item.findById(req.params.id).populate('postedBy', 'name');
  if (!item) throw new AppError('Item not found', 404);
  if (item.type !== 'lost') {
    throw new AppError('Flyers are only available for lost items', 400);
  }

  const svg = await generateItemFlyerSvg(item);
  const safeTitle = String(item.title || 'item')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase() || 'item';

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reclaimit-flyer-${safeTitle}.svg"`
  );
  res.send(svg);
});

