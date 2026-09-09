import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type {
  AdminStats,
  Conversation,
  Item,
  ItemFilters,
  Message,
  Notification,
  Pagination,
  User,
  Violation,
} from '../types';
import { API_BASE } from './constants';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

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
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status !== 404) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
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
  getMe: () => api.get<{ success: boolean; user: User }>('/auth/me'),
  updateProfile: (data: { name?: string; studentId?: string; avatar?: string }) =>
    api.put<{ success: boolean; user: User }>('/auth/profile', data),
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
  getById: (id: string) => api.get<{ success: boolean; item: Item }>(`/items/${id}`),
  getMyItems: () => api.get<{ success: boolean; items: Item[] }>('/items/my'),
  getMatches: (id: string, limit = 10) =>
    api.get<{ success: boolean; matches: Item[] }>(`/items/${id}/matches`, { params: { limit } }),
  create: (formData: FormData) =>
    api.post<{ success: boolean; item: Item; suggestedMatches: Item[] }>('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, formData: FormData) =>
    api.put<{ success: boolean; item: Item }>(`/items/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/items/${id}`),
  claim: (id: string) => api.post<{ success: boolean; item: Item }>(`/items/${id}/claim`),
  resolve: (id: string) => api.post<{ success: boolean; item: Item }>(`/items/${id}/resolve`),
};

// Messages
export const messagesApi = {
  send: (data: { receiverId: string; content: string; itemId?: string }) =>
    api.post<{ success: boolean; message: Message }>('/messages', data),
  getConversations: () =>
    api.get<{ success: boolean; conversations: Conversation[] }>('/messages/conversations'),
  getMessages: (userId: string, page = 1) =>
    api.get<{ success: boolean; messages: Message[]; pagination: Pagination }>(`/messages/${userId}`, {
      params: { page },
    }),
  getUnreadCount: () => api.get<{ success: boolean; unreadCount: number }>('/messages/unread'),
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
