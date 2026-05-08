import { create } from 'zustand';
import { api } from '../api/client';

interface User {
  did: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  login: (handle: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  setUser: (u) => set({ user: u }),
  login: async (handle, password) => {
    set({ loading: true });
    try {
      const { user } = await api.login(handle, password);
      set({ user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
  checkAuth: async () => {
    try {
      const { user } = await api.me();
      set({ user });
    } catch {
      set({ user: null });
    }
  },
}));