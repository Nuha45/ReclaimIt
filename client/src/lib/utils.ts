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
  return path.startsWith('/') ? path : `/${path}`;
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

/** Claimed only after founder accepts — pending requests stay Available / Claim pending. */
export function getDisplayStatus(
  item: { status: string; claimedBy?: unknown; pendingClaims?: number },
  pendingClaims = 0
) {
  const pending = pendingClaims || item.pendingClaims || 0;
  if (item.status === 'resolved') return { label: 'Returned', key: 'resolved' };
  if (item.status === 'removed') return { label: 'Removed', key: 'removed' };
  // Only "Claimed" after the founder accepts (claimedBy set)
  if (item.claimedBy) return { label: 'Claimed', key: 'claimed' };
  if (item.status === 'claimed' && !item.claimedBy) {
    if (pending > 0) return { label: 'Claim pending', key: 'pending' };
    return { label: 'Available', key: 'active' };
  }
  if (pending > 0) return { label: 'Claim pending', key: 'pending' };
  return { label: 'Available', key: 'active' };
}

export function getMatchLabel(score?: number) {
  if (score === undefined || score === null) return null;
  if (score >= 75) return { tier: 'Strong', className: 'bg-accent/20 text-accent border-accent/40' };
  if (score >= 55) return { tier: 'Likely', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  return { tier: 'Possible', className: 'bg-surface-overlay text-text-secondary border-border' };
}
