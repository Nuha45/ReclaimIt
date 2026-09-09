const ClaimRequest = require('../models/ClaimRequest');
const Item = require('../models/Item');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/helpers');
const { createNotification } = require('../utils/matching');

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
    throw new AppError('Not authorized to view claim requests', 403);
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
  if (!claim) throw new AppError('Claim request not found', 404);
  if (claim.owner._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to review this claim request', 403);
  }

  claim.status = status;
  claim.ownerNotes = ownerNotes;
  claim.reviewedAt = new Date();
  if (status === 'completed') claim.completedAt = new Date();
  await claim.save();

  const item = await Item.findById(claim.item._id);

  if (status === 'accepted') {
    // Reject other pending claims for this item
    await ClaimRequest.updateMany(
      { item: item._id, _id: { $ne: claim._id }, status: 'pending' },
      { status: 'rejected', ownerNotes: 'Another claim was accepted for this item.', reviewedAt: new Date() }
    );

    const otherPending = await ClaimRequest.find({
      item: item._id,
      _id: { $ne: claim._id },
      status: 'rejected',
      reviewedAt: { $gte: new Date(Date.now() - 5000) },
    });

    for (const other of otherPending) {
      await createNotification(Notification, {
        user: other.claimer,
        type: 'claim_rejected',
        title: 'Claim Not Selected',
        message: `Another claim for "${item.title}" was accepted. Your request was closed.`,
        relatedItem: item._id,
        relatedUser: claim.owner._id,
      });
    }

    item.claimedBy = claim.claimer._id;
    item.status = 'claimed';

    await Message.create({
      sender: claim.owner._id,
      receiver: claim.claimer._id,
      item: item._id,
      content: `Your claim for "${item.title}" has been accepted. Let's coordinate the return here.`,
    });

    await createNotification(Notification, {
      user: claim.claimer._id,
      type: 'claim_verified',
      title: 'Claim Accepted',
      message: `Your claim for "${item.title}" was accepted. Open Messages to chat with the owner.`,
      relatedItem: item._id,
      relatedUser: claim.owner._id,
    });
  }

  if (status === 'rejected') {
    // Stay active until an owner accepts someone — never mark claimed on reject
    item.status = item.claimedBy ? 'claimed' : 'active';
    await createNotification(Notification, {
      user: claim.claimer._id,
      type: 'claim_rejected',
      title: 'Claim Rejected',
      message: `Your claim for "${item.title}" was rejected by the owner.`,
      relatedItem: item._id,
      relatedUser: claim.owner._id,
    });
  }

  if (status === 'completed') {
    item.status = 'resolved';
    await createNotification(Notification, {
      user: claim.claimer._id,
      type: 'claim_completed',
      title: 'Item Returned',
      message: `The return for "${item.title}" has been marked as completed.`,
      relatedItem: item._id,
      relatedUser: claim.owner._id,
    });
  }

  await item.save();

  res.status(200).json({ success: true, claim: await getClaimById(claim._id) });
});
