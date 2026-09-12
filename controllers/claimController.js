const ClaimRequest = require('../models/ClaimRequest');
const Item = require('../models/Item');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');
const {
  sendClaimDecisionEmail,
  sendClaimCompletedEmail,
} = require('../utils/emailService');
const {
  acceptedForSubmitter,
  acceptedForPoster,
  rejectedForSubmitter,
  notSelectedForSubmitter,
  returnedForUser,
  returnedForPoster,
  acceptChatMessage,
  otherRejectedNotes,
  isLostItem,
} = require('../utils/itemTerminology');

async function getClaimById(id) {
  return ClaimRequest.findById(id)
    .populate('item')
    .populate('owner', 'name email avatar averageRating')
    .populate('claimer', 'name email avatar averageRating');
}

exports.getClaims = asyncHandler(async (req, res) => {
  const claims = await ClaimRequest.find({
    $or: [{ owner: req.user._id }, { claimer: req.user._id }],
  })
    .populate('item')
    .populate('owner', 'name email avatar averageRating')
    .populate('claimer', 'name email avatar averageRating')
    .sort('-createdAt');

  res.status(200).json({ success: true, claims });
});

exports.getItemClaims = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.itemId);
  if (!item) throw new AppError('Item not found', 404);
  if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError(
      isLostItem(item)
        ? 'Not authorized to view found reports'
        : 'Not authorized to view claim requests',
      403
    );
  }

  const claims = await ClaimRequest.find({ item: item._id })
    .populate('item')
    .populate('owner', 'name email avatar averageRating')
    .populate('claimer', 'name email avatar averageRating')
    .sort('-createdAt');

  res.status(200).json({ success: true, claims });
});

exports.reviewClaim = asyncHandler(async (req, res) => {
  const { status, ownerNotes = '' } = req.body;
  if (!['accepted', 'rejected', 'completed'].includes(status)) {
    throw new AppError('Invalid claim status', 400);
  }

  const claim = await getClaimById(req.params.id);
  if (!claim) {
    throw new AppError('Request not found', 404);
  }
  if (claim.owner._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to review this request', 403);
  }

  claim.status = status;
  claim.ownerNotes = ownerNotes;
  claim.reviewedAt = new Date();
  if (status === 'completed') claim.completedAt = new Date();
  await claim.save();

  const item = await Item.findById(claim.item._id);

  if (status === 'accepted') {
    await ClaimRequest.updateMany(
      { item: item._id, _id: { $ne: claim._id }, status: 'pending' },
      {
        status: 'rejected',
        ownerNotes: otherRejectedNotes(item),
        reviewedAt: new Date(),
      }
    );

    const otherPending = await ClaimRequest.find({
      item: item._id,
      _id: { $ne: claim._id },
      status: 'rejected',
      reviewedAt: { $gte: new Date(Date.now() - 5000) },
    }).populate('claimer', 'name email');

    for (const other of otherPending) {
      const copy = notSelectedForSubmitter({ item });
      await createNotification(Notification, {
        user: other.claimer._id || other.claimer,
        type: 'claim_rejected',
        title: copy.title,
        message: copy.message,
        relatedItem: item._id,
        relatedUser: claim.owner._id,
      });
      if (other.claimer?.email) {
        sendClaimDecisionEmail({
          claimer: other.claimer,
          item,
          decision: 'rejected',
        }).catch(() => {});
      }
    }

    item.claimedBy = claim.claimer._id;
    item.status = 'claimed';

    await Message.create({
      sender: claim.owner._id,
      receiver: claim.claimer._id,
      item: item._id,
      content: acceptChatMessage({ item }),
    });

    const submitterId = claim.claimer._id || claim.claimer;
    const posterId = claim.owner._id || claim.owner;
    const forSubmitter = acceptedForSubmitter({ item });
    const forPoster = acceptedForPoster({ item, actorName: claim.claimer.name });

    await createNotification(Notification, {
      user: submitterId,
      type: 'claim_verified',
      title: forSubmitter.title,
      message: forSubmitter.message,
      relatedItem: item._id,
      relatedUser: posterId,
    });

    await createNotification(Notification, {
      user: posterId,
      type: 'claim_verified',
      title: forPoster.title,
      message: forPoster.message,
      relatedItem: item._id,
      relatedUser: submitterId,
    });

    sendClaimDecisionEmail({
      claimer: claim.claimer,
      item,
      decision: 'accepted',
    }).catch(() => {});
  }

  if (status === 'rejected') {
    item.status = item.claimedBy ? 'claimed' : 'active';
    const copy = rejectedForSubmitter({ item });
    await createNotification(Notification, {
      user: claim.claimer._id,
      type: 'claim_rejected',
      title: copy.title,
      message: copy.message,
      relatedItem: item._id,
      relatedUser: claim.owner._id,
    });

    sendClaimDecisionEmail({
      claimer: claim.claimer,
      item,
      decision: 'rejected',
    }).catch(() => {});
  }

  if (status === 'completed') {
    item.status = 'resolved';
    const forOther = returnedForUser({ item });
    const forOwner = returnedForPoster({ item, otherName: claim.claimer.name });

    await createNotification(Notification, {
      user: claim.claimer._id,
      type: 'claim_completed',
      title: forOther.title,
      message: forOther.message,
      relatedItem: item._id,
      relatedUser: claim.owner._id,
    });

    await createNotification(Notification, {
      user: claim.owner._id,
      type: 'claim_completed',
      title: forOwner.title,
      message: forOwner.message,
      relatedItem: item._id,
      relatedUser: claim.claimer._id,
    });

    sendClaimCompletedEmail({
      user: claim.claimer,
      item,
      otherName: claim.owner.name,
    }).catch(() => {});
    sendClaimCompletedEmail({
      user: claim.owner,
      item,
      otherName: claim.claimer.name,
    }).catch(() => {});
  }

  await item.save();

  res.status(200).json({ success: true, claim: await getClaimById(claim._id) });
});
