import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, tokenStore } from '../lib/api';
import type { LoginResponse, MeResponse, User } from '../types/api';

type AuthState = {
  user: User | null;
  /** Ilova birinchi ochilganda tokenni tekshirish holati */
  status: 'idle' | 'loading' | 'ready';
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'idle',

      async login(username, password) {
        const res = await api.post<LoginResponse>('/api/auth/login', {
          username: username.trim().toLowerCase(),
          password,
        });
        tokenStore.set(res.token);
        set({ user: res.user, status: 'ready' });
        return res.user;
      },

      logout() {
        tokenStore.clear();
        set({ user: null, status: 'ready' });
      },

      setUser(user) {
        set({ user });
      },

      /** Ilova ochilganda: token bor bo'lsa kimligini serverdan tasdiqlaymiz */
      async bootstrap() {
        if (!tokenStore.get()) {
          set({ user: null, status: 'ready' });
          return;
        }
        set({ status: 'loading' });
        try {
          const res = await api.get<MeResponse>('/api/auth/me');
          set({ user: res.user, status: 'ready' });
        } catch {
          tokenStore.clear();
          set({ user: null, status: 'ready' });
        }
      },

      async refresh() {
        const res = await api.get<MeResponse>('/api/auth/me');
        set({ user: res.user });
      },
    }),
    {
      name: 'pos.auth',
      // Faqat foydalanuvchi ma'lumoti saqlanadi; token alohida (pos.token) turadi
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
