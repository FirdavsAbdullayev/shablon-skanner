import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export type Toast = {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
};

type ToastState = {
  toasts: Toast[];
  push: (kind: ToastKind, message: string, title?: string) => void;
  dismiss: (id: string) => void;
};

function uid(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push(kind, message, title) {
    const id = uid();
    set({ toasts: [...get().toasts, { id, kind, message, title }] });
    // Muvaffaqiyatli xabar qisqa, xato xabari uzoqroq ko'rinadi
    const ttl = kind === 'error' ? 6000 : kind === 'warn' ? 4500 : 3000;
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, ttl);
  },

  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** React komponentidan tashqarida ham ishlatish uchun qulaylik */
export const toast = {
  success: (message: string, title?: string) => useToastStore.getState().push('success', message, title),
  error: (message: string, title?: string) => useToastStore.getState().push('error', message, title),
  info: (message: string, title?: string) => useToastStore.getState().push('info', message, title),
  warn: (message: string, title?: string) => useToastStore.getState().push('warn', message, title),
};
