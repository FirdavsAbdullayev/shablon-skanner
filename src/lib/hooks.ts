import { useCallback, useEffect, useRef, useState } from 'react';
import { flushPendingSales, listPending, pendingCount, type PendingSale } from './queue';

/** Internet holatini kuzatish */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

/**
 * Oflayn navbatni kuzatish va internet qaytganda avtomatik yuborish.
 * Shuningdek har 60 sekundda bir marta qayta urinib ko'radi.
 */
export function usePendingQueue(onSynced?: (sentCount: number) => void) {
  const [count, setCount] = useState<number>(() => pendingCount());
  const [items, setItems] = useState<PendingSale[]>(() => listPending());
  const [syncing, setSyncing] = useState(false);
  const online = useOnline();
  const syncedRef = useRef(onSynced);
  syncedRef.current = onSynced;

  const reload = useCallback(() => {
    setCount(pendingCount());
    setItems(listPending());
  }, []);

  useEffect(() => {
    window.addEventListener('pos:queue-changed', reload);
    return () => window.removeEventListener('pos:queue-changed', reload);
  }, [reload]);

  const flush = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await flushPendingSales();
      reload();
      if (result.sent > 0) syncedRef.current?.(result.sent);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  // Internet qaytganda avtomatik yuborish
  useEffect(() => {
    if (!online || count === 0) return;
    void flush();
  }, [online, count, flush]);

  // Davriy urinish (internet bor, lekin server vaqtincha javob bermagan holatlar)
  useEffect(() => {
    if (count === 0) return;
    const timer = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [count, flush]);

  return { count, items, online, syncing, flush, reload };
}

/** Kiritishni kechiktirish (qidiruv maydonlari uchun) */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
