import { create } from 'zustand';
import { authApi } from '../api';
import { getToken, setToken } from '../api/client';
import { PublicUser } from '../types';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (u: PublicUser) => void;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),

  // On app start: if we have a token, fetch the current user.
  bootstrap: async () => {
    if (!getToken()) {
      set({ initialized: true });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, initialized: true });
    } catch {
      setToken(null);
      set({ user: null, initialized: true });
    }
  },

  login: async (username, password) => {
    set({ loading: true });
    try {
      const { token, user } = await authApi.login(username, password);
      setToken(token);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
