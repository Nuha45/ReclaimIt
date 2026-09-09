import type { ItemCategory, ViolationReason } from '../types';

export const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'books', label: 'Books' },
  { value: 'documents', label: 'Documents' },
  { value: 'keys', label: 'Keys' },
  { value: 'bags', label: 'Bags' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export const VIOLATION_REASONS: { value: ViolationReason; label: string }[] = [
  { value: 'fraudulent_post', label: 'Fraudulent Post' },
  { value: 'misleading_info', label: 'Misleading Information' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  claimed: 'Claimed',
  resolved: 'Resolved',
  removed: 'Removed',
};

export const ITEM_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  claimed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  removed: 'bg-red-500/15 text-red-400 border-red-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export const TYPE_COLORS: Record<string, string> = {
  lost: 'bg-red-500/15 text-red-400 border-red-500/30',
  found: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export const API_BASE = '/api';
