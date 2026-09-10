const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const ClaimRequest = require('../models/ClaimRequest');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');

const LOW_RATING_THRESHOLD = 2;

function toObjectId(id) {
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id);
}

async function recalculateUserRating(userId) {
  const oid = toObjectId(userId);
  const stats = await Review.aggregate([
    { $match: { reviewee: oid } },
    {
      $group: {
        _id: '$reviewee',
        averageRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const user = await User.findById(oid);
  if (!user) return null;

  if (!stats.length) {
    user.averageRating = 0;
    user.reviewCount = 0;
    user.isRatingFlagged = false;
  } else {
    user.averageRating = Number(stats[0].averageRating.toFixed(1));
    user.reviewCount = stats[0].count;
    user.isRatingFlagged = user.averageRating > 0 && user.averageRating < LOW_RATING_THRESHOLD;
  }

  await user.save();
  return user;
}

exports.createReview = asyncHandler(async (req, res) => {
  const { revieweeId, rating, comment = '', claimRequestId } = req.body;

  if (!revieweeId || !rating || !claimRequestId) {
    throw new AppError('revieweeId, rating, and claimRequestId are required', 400);
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new AppError('Rating must be an integer from 1 to 5', 400);
  }

  if (revieweeId === req.user._id.toString()) {
    throw new AppError('You cannot review yourself', 400);
  }

  const claim = await ClaimRequest.findById(claimRequestId);
  if (!claim) throw new AppError('Claim request not found', 404);
  if (claim.status !== 'completed') {
    throw new AppError('Reviews are only allowed after a claim is completed', 400);
  }

  const isOwner = claim.owner.toString() === req.user._id.toString();
  const isClaimer = claim.claimer.toString() === req.user._id.toString();
  if (!isOwner && !isClaimer) {
    throw new AppError('Only claim participants can leave a review', 403);
  }

  const expectedReviewee = isOwner ? claim.claimer.toString() : claim.owner.toString();
  if (revieweeId !== expectedReviewee) {
    throw new AppError('You can only review the other party on this claim', 400);
  }

  const existing = await Review.findOne({ claimRequest: claimRequestId, reviewer: req.user._id });
  if (existing) throw new AppError('You already reviewed this claim', 400);

  const review = await Review.create({
    rating: numericRating,
    comment: String(comment).trim(),
    reviewer: req.user._id,
    reviewee: revieweeId,
    claimRequest: claimRequestId,
    item: claim.item,
  });

  const updatedReviewee = await recalculateUserRating(revieweeId);

  await createNotification(Notification, {
    user: revieweeId,
    type: 'review_received',
    title: 'New review received',
    message: `${req.user.name} rated you ${numericRating}/5 after a completed return.`,
    relatedUser: req.user._id,
    relatedItem: claim.item,
  });

  if (updatedReviewee?.isRatingFlagged) {
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(
      admins.map((admin) =>
        createNotification(Notification, {
          user: admin._id,
          type: 'admin_action',
          title: 'Low-rated user flagged',
          message: `${updatedReviewee.name} has an average rating of ${updatedReviewee.averageRating} (< ${LOW_RATING_THRESHOLD}).`,
          relatedUser: updatedReviewee._id,
        })
      )
    );
  }

  const populated = await Review.findById(review._id)
    .populate('reviewer', 'name avatar')
    .populate('reviewee', 'name avatar averageRating reviewCount isRatingFlagged');

  res.status(201).json({
    success: true,
    review: populated,
    reviewee: updatedReviewee,
  });
});

exports.getReviewsForUser = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId })
    .populate('reviewer', 'name avatar')
    .populate('item', 'title type')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({ success: true, reviews });
});

exports.getMyPendingReviews = asyncHandler(async (req, res) => {
  const completedClaims = await ClaimRequest.find({
    status: 'completed',
    $or: [{ owner: req.user._id }, { claimer: req.user._id }],
  })
    .populate('item', 'title type images')
    .populate('owner', 'name avatar averageRating')
    .populate('claimer', 'name avatar averageRating')
    .sort('-completedAt');

  const reviewedClaimIds = await Review.find({ reviewer: req.user._id }).distinct('claimRequest');
  const reviewedSet = new Set(reviewedClaimIds.map((id) => id.toString()));

  const pending = completedClaims
    .filter((claim) => !reviewedSet.has(claim._id.toString()))
    .map((claim) => {
      const isOwner = claim.owner._id.toString() === req.user._id.toString();
      return {
        claim,
        reviewee: isOwner ? claim.claimer : claim.owner,
      };
    });

  res.status(200).json({ success: true, pending });
});

exports.recalculateUserRating = recalculateUserRating;
