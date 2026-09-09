import { create } from 'zustand';
import { authApi } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  fetchUser: async () => {
    try {
      const { data } = await authApi.getMe();
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch {
      get().logout();
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    await get().fetchUser();
  },
}));
