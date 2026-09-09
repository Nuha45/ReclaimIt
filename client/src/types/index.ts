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
  images: string[];
  keywords?: string[];
  postedBy: User;
  claimedBy?: User | null;
  isFlagged?: boolean;
  flagCount?: number;
  matchScore?: number;
  createdAt: string;
  updatedAt?: string;
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
