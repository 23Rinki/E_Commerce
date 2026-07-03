import { create } from 'zustand';

interface UIState {
  loginModalOpen: boolean;
  loginModalTab: 'login' | 'register';
  openLoginModal: (tab?: 'login' | 'register') => void;
  closeLoginModal: () => void;

  searchNoResultsFor: string | null;
  setSearchNoResults: (query: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  loginModalOpen: false,
  loginModalTab: 'login',
  openLoginModal:  (tab = 'login') => set({ loginModalOpen: true, loginModalTab: tab }),
  closeLoginModal: () => set({ loginModalOpen: false, loginModalTab: 'login' }),

  searchNoResultsFor: null,
  setSearchNoResults: (query) => set({ searchNoResultsFor: query }),
}));
