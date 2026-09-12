import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type {
  AdminStats,
  ClaimRequest,
  Conversation,
  Item,
  ItemFilters,
  Message,
  Notification,
  Pagination,
  PendingReview,
  Review,
  SearchHistoryEntry,
  User,
  Violation,
} from '../types';
import { API_BASE } from './constants';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Avoid spamming the same toast repeatedly (e.g. polling 429s)
let lastToastAt = 0;
let lastToastMessage = '';

function showErrorToast(message: string) {
  const now = Date.now();
  if (message === lastToastMessage && now - lastToastAt < 4000) return;
  lastToastMessage = message;
  lastToastAt = now;
  toast.error(message);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const silent = Boolean(error.config?.headers?.['X-Silent-Error']);

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
    } else if (status === 429) {
      if (!silent) {
        showErrorToast('Too many requests. Please wait a moment and try again.');
      }
    } else if (status !== 404 && !silent) {
      showErrorToast(message);
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

// Auth
export const authApi = {
  signup: (data: { name: string; email: string; password: string; studentId?: string }) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/login', data),
  forgotPassword: (data: { email: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/forgot-password', data),
  validateResetToken: (token: string) =>
    api.get<{ success: boolean; valid: boolean }>(
      `/auth/reset-password/${encodeURIComponent(token)}/validate`,
      { headers: { 'X-Silent-Error': '1' } }
    ),
  resetPassword: (data: { token: string; password: string; confirmPassword: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/reset-password', data),
  getMe: () => api.get<{ success: boolean; user: User }>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put<{ success: boolean; message: string }>('/auth/change-password', data),
  updateProfile: (data: { name?: string; studentId?: string; avatar?: string }) =>
    api.put<{ success: boolean; user: User }>('/auth/profile', data),
  getSavedItems: () => api.get<{ success: boolean; items: Item[] }>('/auth/saved-items'),
  toggleSavedItem: (itemId: string) =>
    api.post<{ success: boolean; isSaved: boolean; items: Item[] }>('/auth/saved-items/toggle', { itemId }),
  getSearchHistory: () =>
    api.get<{ success: boolean; searches: SearchHistoryEntry[] }>('/auth/search-history'),
  saveSearch: (data: { query: string; filters?: Record<string, unknown> }) =>
    api.post<{ success: boolean; searches: SearchHistoryEntry[] }>('/auth/search-history', data),
  addReview: (data: { userId: string; score: number; review?: string; claimRequestId?: string }) =>
    api.post<{ success: boolean; user: User }>('/auth/reviews', data),
  getNotifications: (params?: { page?: number; unreadOnly?: boolean }) =>
    api.get<{ success: boolean; notifications: Notification[]; unreadCount: number; pagination: Pagination }>(
      '/auth/notifications',
      { params }
    ),
  markNotificationRead: (id: string) =>
    api.put<{ success: boolean; notification: Notification }>(`/auth/notifications/${id}/read`),
  markAllNotificationsRead: () =>
    api.put<{ success: boolean; message: string }>('/auth/notifications/read-all'),
};

// Items
export const itemsApi = {
  getAll: (params?: ItemFilters) =>
    api.get<{ success: boolean; items: Item[]; pagination: Pagination }>('/items', { params }),
  getById: (id: string) =>
    api.get<{
      success: boolean;
      item: Item;
      claimRequests?: ClaimRequest[];
      pendingClaims?: number;
      myClaim?: ClaimRequest | null;
    }>(`/items/${id}`),
  getMyItems: () => api.get<{ success: boolean; items: Item[] }>('/items/my'),
  getMatches: (id: string, limit = 10) =>
    api.get<{ success: boolean; matches: Item[] }>(`/items/${id}/matches`, { params: { limit } }),
  getQrUrl: (id: string) => `${API_BASE}/items/${id}/qr`,
  getFlyerUrl: (id: string) => `${API_BASE}/items/${id}/flyer`,
  create: (formData: FormData) =>
    api.post<{ success: boolean; item: Item; suggestedMatches: Item[] }>('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, formData: FormData) =>
    api.put<{ success: boolean; item: Item }>(`/items/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addPhotos: (id: string, formData: FormData) =>
    api.post<{ success: boolean; item: Item }>(`/items/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/items/${id}`),
  claim: (
    id: string,
    data: { verificationAnswers: { questionId: string; answer: string }[]; claimerMessage?: string }
  ) => api.post<{ success: boolean; item: Item; claimRequest: ClaimRequest }>(`/items/${id}/claim`, data),
  resolve: (id: string) => api.post<{ success: boolean; item: Item }>(`/items/${id}/resolve`),
};

export const claimsApi = {
  getAll: () => api.get<{ success: boolean; claims: ClaimRequest[] }>('/claims'),
  getForItem: (itemId: string) => api.get<{ success: boolean; claims: ClaimRequest[] }>(`/claims/item/${itemId}`),
  review: (id: string, data: { status: 'accepted' | 'rejected' | 'completed'; ownerNotes?: string }) =>
    api.put<{ success: boolean; claim: ClaimRequest }>(`/claims/${id}/review`, data),
};

export const reviewsApi = {
  create: (data: { revieweeId: string; rating: number; comment?: string; claimRequestId: string }) =>
    api.post<{ success: boolean; review: Review; reviewee: User }>('/reviews', data),
  getPending: () => api.get<{ success: boolean; pending: PendingReview[] }>('/reviews/pending'),
  getForUser: (userId: string) => api.get<{ success: boolean; reviews: Review[] }>(`/reviews/user/${userId}`),
};

// Messages
export const messagesApi = {
  send: (data: { receiverId: string; content: string; itemId?: string }) =>
    api.post<{ success: boolean; message: Message }>('/messages', data),
  getConversations: () =>
    api.get<{ success: boolean; conversations: Conversation[] }>('/messages/conversations', {
      headers: { 'X-Silent-Error': '1' },
    }),
  getMessages: (userId: string, page = 1) =>
    api.get<{ success: boolean; messages: Message[]; pagination: Pagination }>(`/messages/${userId}`, {
      params: { page },
      headers: { 'X-Silent-Error': '1' },
    }),
  getUnreadCount: () =>
    api.get<{ success: boolean; unreadCount: number }>('/messages/unread', {
      headers: { 'X-Silent-Error': '1' },
    }),
  markAsRead: (id: string) =>
    api.put<{ success: boolean; message: Message }>(`/messages/${id}/read`),
};

// Violations
export const violationsApi = {
  report: (data: { reportedUserId: string; itemId?: string; reason: string; description?: string }) =>
    api.post<{ success: boolean; message: string; violation: Violation }>('/violations', data),
  getMyReports: () => api.get<{ success: boolean; violations: Violation[] }>('/violations/my-reports'),
};

// Admin
export const adminApi = {
  getDashboard: () =>
    api.get<{
      success: boolean;
      stats: AdminStats;
      recentItems: Item[];
      recentViolations: Violation[];
    }>('/admin/dashboard'),
  getStats: () => api.get<{ success: boolean; stats: AdminStats }>('/admin/stats'),
  getUsers: (params?: { page?: number; banned?: boolean }) =>
    api.get<{ success: boolean; users: User[]; pagination: Pagination }>('/admin/users', { params }),
  banUser: (id: string) => api.put<{ success: boolean; message: string }>(`/admin/users/${id}/ban`),
  unbanUser: (id: string) => api.put<{ success: boolean; message: string }>(`/admin/users/${id}/unban`),
  promoteUser: (id: string) => api.put<{ success: boolean; message: string }>(`/admin/users/${id}/promote`),
  getItems: (params?: { status?: string; type?: string; page?: number }) =>
    api.get<{ success: boolean; items: Item[]; pagination: Pagination }>('/admin/items', { params }),
  deleteItem: (id: string) => api.delete<{ success: boolean; message: string }>(`/admin/items/${id}`),
  getViolations: (params?: { status?: string; page?: number }) =>
    api.get<{ success: boolean; violations: Violation[]; pagination: Pagination }>('/admin/violations', {
      params,
    }),
  reviewViolation: (id: string, data: { status: string; adminNotes?: string }) =>
    api.put<{ success: boolean; violation: Violation }>(`/admin/violations/${id}/review`, data),
  getReports: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; report: Record<string, unknown> }>('/admin/reports', { params }),
};

export default api;
