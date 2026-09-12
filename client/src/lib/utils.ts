import { API_ORIGIN } from './constants';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

/** Backend `claim_verified` for the submitter (claimer / found-report author), not the poster who accepted. */
export function isClaimAcceptNotificationForSubmitter(notification: {
  type: string;
  message: string;
}) {
  if (notification.type !== 'claim_verified') return false;
  return !/^you accepted/i.test(notification.message.trim());
}

export function formatRelativeTime(date: string | Date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function capitalize(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * User-facing state for Lost/Found items.
 * DB status stays active|claimed|resolved|removed — labels follow item.type.
 */
export function getDisplayStatus(
  item: { type?: string; status: string; claimedBy?: unknown; pendingClaims?: number },
  pendingClaims = 0
) {
  const pending = pendingClaims || item.pendingClaims || 0;
  const isLost = item.type === 'lost';

  if (item.status === 'resolved') return { label: 'Returned', key: 'resolved' };
  if (item.status === 'removed') return { label: 'Removed', key: 'removed' };

  // Poster accepted a claim / found-report — handoff in progress
  if (item.claimedBy) {
    return {
      label: isLost ? 'Recovery in progress' : 'Claim accepted',
      key: 'claimed',
    };
  }

  // Legacy: status claimed without claimer → treat as open again
  if (item.status === 'claimed' && !item.claimedBy) {
    if (pending > 0) {
      return {
        label: isLost ? 'Found Report Pending' : 'Claim Pending',
        key: 'pending',
      };
    }
    return {
      label: isLost ? 'Still Missing' : 'Unclaimed',
      key: 'active',
    };
  }

  if (pending > 0) {
    return {
      label: isLost ? 'Found Report Pending' : 'Claim Pending',
      key: 'pending',
    };
  }

  return {
    label: isLost ? 'Still Missing' : 'Unclaimed',
    key: 'active',
  };
}

/** Primary CTA copy for non-owners on an open item */
export function getItemActionCopy(type: 'lost' | 'found' | string) {
  if (type === 'lost') {
    return {
      button: 'I Found This Item',
      modalTitle: 'Report that you found this item',
      modalIntro:
        'Tell the owner where and how you found it. They will review your report — nothing is confirmed until they accept.',
      messageLabel: 'Where / how did you find it?',
      messagePlaceholder: 'e.g. Found near Classroom 627 after the 2pm lecture…',
      submit: 'Send Found Report',
      successToast: 'Found report sent! The owner will be notified.',
      ownerPendingTitle: (n: number) =>
        `${n} found report${n > 1 ? 's' : ''} waiting for you`,
      ownerPendingBody:
        'Someone thinks they found your item. Review their details below. The item stays Still Missing until you accept.',
      sectionTitle: 'Found Reports',
      sectionEmpty: 'No found reports yet. When someone finds your item, you’ll get a notification here and in the bell.',
      accept: 'Accept Found Report',
      reject: 'Reject',
      myPending: 'Your found report is waiting for the owner',
      myAccepted: 'Your found report was accepted — open Messages to coordinate the return',
      myRejected: 'Your found report was rejected',
      myCompleted: 'This return is marked complete',
    };
  }

  return {
    button: 'Claim This Item',
    modalTitle: 'Claim this found item',
    modalIntro:
      'Prove this item is yours. The finder reviews your claim — the item stays Unclaimed until they accept.',
    messageLabel: 'Why is this yours?',
    messagePlaceholder: 'Describe unique marks, contents, or when you lost it…',
    submit: 'Submit Claim',
    successToast: 'Claim submitted! The finder will be notified.',
    ownerPendingTitle: (n: number) =>
      `${n} claim request${n > 1 ? 's' : ''} waiting for you`,
    ownerPendingBody:
      'Someone believes this found item is theirs. Review their answers below. The item stays Unclaimed until you accept.',
    sectionTitle: 'Claim Requests',
    sectionEmpty: 'No claims yet. When someone claims this found item, you’ll get a notification here and in the bell.',
    accept: 'Accept Claim',
    reject: 'Reject',
    myPending: 'Your claim is waiting for the finder',
    myAccepted: 'Your claim was accepted — open Messages to coordinate',
    myRejected: 'Your claim was rejected',
    myCompleted: 'This return is marked complete',
  };
}

export function getMatchLabel(score?: number) {
  if (score === undefined || score === null) return null;
  if (score >= 75) return { tier: 'Strong', className: 'bg-accent/20 text-accent border-accent/40' };
  if (score >= 55) return { tier: 'Likely', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  return { tier: 'Possible', className: 'bg-surface-overlay text-text-secondary border-border' };
}
