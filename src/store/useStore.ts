import { create } from 'zustand';
import { removeCookie } from '../api/cookie';

interface MenuItem {
  path: string;
  enabled: boolean;
}

interface ThemeConfig {
  primaryColor: string;
  allowUserThemeChange: boolean;
}

interface User {
  user_id: number;
  login: string;
  gid?: number;
  full_name?: string;
  phone?: string;
  balance?: number;
  bonus?: number;
  credit?: number;
  discount?: number;
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // UI state
  menuItems: MenuItem[];
  themeConfig: ThemeConfig;
  telegramPhoto: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setThemeConfig: (config: ThemeConfig) => void;
  setTelegramPhoto: (photo: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading to check auth

  // UI state
  menuItems: [
    { path: '/', enabled: true },
    { path: '/services', enabled: true },
    { path: '/payments', enabled: true },
    { path: '/withdrawals', enabled: true },
  ],
  themeConfig: { primaryColor: '#228be6', allowUserThemeChange: true },
  telegramPhoto: localStorage.getItem('shm_telegram_photo'),

  // Actions
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
  }),
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setThemeConfig: (config) => set({ themeConfig: config }),
  setTelegramPhoto: (photo) => {
    if (photo) {
      localStorage.setItem('shm_telegram_photo', photo);
    } else {
      localStorage.removeItem('shm_telegram_photo');
    }
    set({ telegramPhoto: photo });
  },
  logout: () => {
    removeCookie();
    localStorage.removeItem('shm_telegram_photo');
    set({ user: null, isAuthenticated: false, telegramPhoto: null });
  },
}));
