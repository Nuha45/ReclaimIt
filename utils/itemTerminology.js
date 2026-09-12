/**
 * User-facing Lost vs Found terminology.
 * DB may still use ClaimRequest for both flows — copy depends on item.type.
 */

function isLostItem(item) {
  return item?.type === 'lost';
}

function titleOf(item) {
  return item?.title || 'item';
}

/** Notifications when someone submits a claim/found-report */
function receivedForPoster({ item, actorName }) {
  if (isLostItem(item)) {
    return {
      title: 'Someone Found Your Item',
      message: `${actorName} reported finding your "${titleOf(item)}". Review their details on the item page.`,
    };
  }
  return {
    title: 'New Claim Request',
    message: `${actorName} requested to claim your found "${titleOf(item)}". Review their answers on the item page.`,
  };
}

function submittedForActor({ item }) {
  if (isLostItem(item)) {
    return {
      title: 'Found Report Sent',
      message: `Your found report for "${titleOf(item)}" was sent. You'll be notified when the owner responds.`,
    };
  }
  return {
    title: 'Claim Request Sent',
    message: `Your claim for "${titleOf(item)}" was sent. You'll be notified when the finder responds.`,
  };
}

function acceptedForSubmitter({ item }) {
  if (isLostItem(item)) {
    return {
      title: '🧡 Great news!',
      message:
        "Your Found Report was accepted. You're helping reunite a lost item with its owner!",
    };
  }
  return {
    title: "🎉 It's happening!",
    message: "Your claim was accepted! You're one step closer to getting your item back. 🧡",
  };
}

function acceptedForPoster({ item, actorName }) {
  if (isLostItem(item)) {
    return {
      title: 'Found Report Accepted',
      message: `You accepted ${actorName}'s report that they found your "${titleOf(item)}". You can now coordinate the return.`,
    };
  }
  return {
    title: 'Claim Accepted',
    message: `You accepted ${actorName}'s claim for your found "${titleOf(item)}". You can now coordinate the return.`,
  };
}

function rejectedForSubmitter({ item }) {
  if (isLostItem(item)) {
    return {
      title: 'Found Report Rejected',
      message: `Your found report for "${titleOf(item)}" was rejected by the owner.`,
    };
  }
  return {
    title: 'Claim Rejected',
    message: `Your claim for "${titleOf(item)}" was rejected.`,
  };
}

function notSelectedForSubmitter({ item }) {
  if (isLostItem(item)) {
    return {
      title: 'Found Report Not Selected',
      message: `Another found report for "${titleOf(item)}" was accepted. Your report was closed.`,
    };
  }
  return {
    title: 'Claim Not Selected',
    message: `Another claim for "${titleOf(item)}" was accepted. Your request was closed.`,
  };
}

function returnedForUser({ item }) {
  return {
    title: 'Item Returned',
    message: `"${titleOf(item)}" has been marked as returned. Please leave a review.`,
  };
}

function returnedForPoster({ item, otherName }) {
  return {
    title: 'Return Completed — Leave a Review',
    message: `Return complete for "${titleOf(item)}". Please rate ${otherName}.`,
  };
}

function acceptChatMessage({ item }) {
  if (isLostItem(item)) {
    return `Thanks for reporting that you found "${titleOf(item)}". Let's coordinate the return here.`;
  }
  return `Your claim for "${titleOf(item)}" has been accepted. Let's coordinate the return here.`;
}

function otherRejectedNotes(item) {
  return isLostItem(item)
    ? 'Another found report was accepted for this item.'
    : 'Another claim was accepted for this item.';
}

/**
 * Rewrite stored notification copy when related item is LOST but text still says "claim".
 * Safe for display and optional DB heal — does not invent data.
 */
function presentNotification(notification) {
  if (!notification) return notification;
  const item = notification.relatedItem;
  if (!item || item.type !== 'lost') return notification;

  const title = String(notification.title || '');
  const message = String(notification.message || '');
  const looksLikeClaimCopy =
    /claim/i.test(title) ||
    /claim/i.test(message) ||
    /requested to claim/i.test(message);

  if (!looksLikeClaimCopy) {
    // Normalize older soft titles to preferred casing when already found-report themed
    if (/^someone found your item$/i.test(title)) {
      return { ...notification, title: 'Someone Found Your Item' };
    }
    return notification;
  }

  const actor =
    notification.relatedUser?.name ||
    (message.match(/^(.+?) (?:requested|reported|submitted)/i) || [])[1] ||
    'Someone';
  const itemTitle = item.title || 'item';

  switch (notification.type) {
    case 'claim_received':
      return {
        ...notification,
        title: 'Someone Found Your Item',
        message: `${actor} reported finding your "${itemTitle}". Review their details on the item page.`,
      };
    case 'item_claimed':
      return {
        ...notification,
        title: 'Found Report Sent',
        message: `Your found report for "${itemTitle}" was sent. You'll be notified when the owner responds.`,
      };
    case 'claim_verified':
      if (/you accepted/i.test(message)) {
        return {
          ...notification,
          title: 'Found Report Accepted',
          message: `You accepted ${actor}'s report that they found your "${itemTitle}". You can now coordinate the return.`,
        };
      }
      return {
        ...notification,
        title: '🧡 Great news!',
        message:
          "Your Found Report was accepted. You're helping reunite a lost item with its owner!",
      };
    case 'claim_rejected':
      return {
        ...notification,
        title: 'Found Report Rejected',
        message: /another/i.test(message)
          ? `Another found report for "${itemTitle}" was accepted. Your report was closed.`
          : `Your found report for "${itemTitle}" was rejected by the owner.`,
      };
    default:
      return {
        ...notification,
        title: title.replace(/claim request/gi, 'Found Report').replace(/\bclaim\b/gi, 'found report'),
        message: message
          .replace(/requested to claim/gi, 'reported finding')
          .replace(/your claim/gi, 'your found report')
          .replace(/claim request/gi, 'found report')
          .replace(/\bclaim\b/gi, 'found report'),
      };
  }
}

module.exports = {
  isLostItem,
  receivedForPoster,
  submittedForActor,
  acceptedForSubmitter,
  acceptedForPoster,
  rejectedForSubmitter,
  notSelectedForSubmitter,
  returnedForUser,
  returnedForPoster,
  acceptChatMessage,
  otherRejectedNotes,
  presentNotification,
};
