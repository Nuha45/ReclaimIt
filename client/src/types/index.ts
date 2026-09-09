export type UserRole = 'user' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: UserRole;
  avatar?: string | null;
  studentId?: string | null;
  isBanned?: boolean;
  violationCount?: number;
  averageRating?: number;
  savedItems?: Item[];
  recentSearches?: SearchHistoryEntry[];
  createdAt?: string;
}

export type ItemType = 'lost' | 'found';
export type ItemStatus = 'active' | 'claimed' | 'resolved' | 'removed';
export type ItemCategory =
  | 'electronics'
  | 'clothing'
  | 'accessories'
  | 'books'
  | 'documents'
  | 'keys'
  | 'bags'
  | 'sports'
  | 'other';

export interface ItemLocation {
  name: string;
  building?: string;
  coordinates?: { lat: number; lng: number };
}

export interface Item {
  _id: string;
  title: string;
  description: string;
  category: ItemCategory;
  type: ItemType;
  status: ItemStatus;
  location: ItemLocation;
  dateLostFound: string;
  color?: string;
  brand?: string;
  size?: string;
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'poor';
  uniqueMarks?: string;
  images: string[];
  photos?: ItemPhoto[];
  verificationQuestions?: VerificationQuestion[];
  keywords?: string[];
  postedBy: User;
  claimedBy?: User | null;
  isFlagged?: boolean;
  flagCount?: number;
  claimCount?: number;
  pendingClaims?: number;
  matchScore?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ItemPhoto {
  _id: string;
  item: string;
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface VerificationQuestion {
  _id: string;
  item?: string;
  question: string;
  isSensitive?: boolean;
}

export interface ClaimAnswer {
  questionId: string;
  question: string;
  answer: string;
  isCorrect?: boolean;
}

export type ClaimStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface ClaimRequest {
  _id: string;
  item: Item;
  owner: User;
  claimer: User;
  status: ClaimStatus;
  verificationAnswers: ClaimAnswer[];
  verificationScore: number;
  claimerMessage?: string;
  ownerNotes?: string;
  reviewedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SearchHistoryEntry {
  query: string;
  filters?: Record<string, unknown>;
  createdAt: string;
}

export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  content: string;
  item?: Item | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  participant: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedItem?: Item | null;
  relatedUser?: User | null;
  isRead: boolean;
  createdAt: string;
}

export type ViolationReason =
  | 'fraudulent_post'
  | 'misleading_info'
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'other';

export type ViolationStatus = 'pending' | 'reviewed' | 'dismissed' | 'confirmed';

export interface Violation {
  _id: string;
  reportedBy: User;
  reportedUser: User;
  item?: Item | null;
  reason: ViolationReason;
  description?: string;
  status: ViolationStatus;
  adminNotes?: string;
  reviewedBy?: User | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  [key: string]: T | boolean | string | undefined;
}

export interface ItemFilters {
  search?: string;
  category?: ItemCategory | '';
  type?: ItemType | '';
  status?: ItemStatus | '';
  location?: string;
  color?: string;
  brand?: string;
  size?: string;
  condition?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  sort?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalItems: number;
  activeItems: number;
  pendingViolations: number;
  bannedUsers: number;
}
