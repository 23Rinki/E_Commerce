import { create } from 'zustand';
import { User } from '@/types';
import api from '@/lib/api';
import { clearCategories } from '@/lib/categoriesCache';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    clearCategories();
    // Reset isInitialized so cart/protected calls wait for initAuth() on the next page
    // instead of firing immediately with an unverified token and hitting a 401 redirect.
    set({ user, token, isAuthenticated: true, isInitialized: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearCategories();
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    // Set immediately from localStorage for fast UI (Navbar, cart, etc.)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('user');
      }
    }

    // Verify with server — clears session if user deleted or token expired
    try {
      const res = await api.get('/api/auth/me');
      const user = res.data?.data || res.data;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isInitialized: true });
      } else {
        throw new Error('no user');
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
