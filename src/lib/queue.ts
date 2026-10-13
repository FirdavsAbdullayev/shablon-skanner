import { ApiError, api } from './api';
import type { PaymentMethod, Sale } from '../types/api';

/**
 * OFLAYN SOTUV NAVBATI
 *
 * Internet uzilganda yoki server javob bermasa, chek shu yerda
 * (localStorage) saqlanadi va aloqa tiklanganda avtomatik yuboriladi.
 *
 * Har bir chekda `clientRef` bor va u bazada UNIKAL - shuning uchun
 * bir chek ikki marta yuborilsa ham, ikkinchi marta yozilmaydi
 * (dublikat hisob-kitob bo'lmaydi).
 */

export type PendingSalePayload = {
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  amountPaid?: number | null;
  note?: string | null;
  clientRef: string;
};

export type PendingSale = {
  clientRef: string;
  createdAt: string;
  total: number;
  payload: PendingSalePayload;
  attempts: number;
  /** Server aniq xato qaytarsa (masalan ombor yetmasa) shu yerda saqlanadi */
  failed?: string | null;
};

const KEY = 'pos.pending-sales';

export function listPending(): PendingSale[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list: PendingSale[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('pos:queue-changed'));
}

export function addPending(entry: PendingSale): void {
  const list = listPending().filter((p) => p.clientRef !== entry.clientRef);
  list.push(entry);
  persist(list);
}

export function removePending(clientRef: string): void {
  persist(listPending().filter((p) => p.clientRef !== clientRef));
}

function markFailed(clientRef: string, message: string): void {
  persist(
    listPending().map((p) =>
      p.clientRef === clientRef ? { ...p, failed: message, attempts: p.attempts + 1 } : p,
    ),
  );
}

function markAttempt(clientRef: string): void {
  persist(
    listPending().map((p) => (p.clientRef === clientRef ? { ...p, attempts: p.attempts + 1 } : p)),
  );
}

export function pendingCount(): number {
  return listPending().length;
}

export function newClientRef(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `off-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type FlushResult = { sent: number; failed: number; remaining: number };

/**
 * Navbatdagi barcha cheklarni serverga yuborish.
 * Tarmoq xatosi bo'lsa to'xtaymiz (keyinroq yana urinib ko'ramiz),
 * serverning mantiqiy xatosi bo'lsa chekni "tekshirish kerak" deb belgilaymiz.
 */
export async function flushPendingSales(): Promise<FlushResult> {
  const list = listPending();
  if (list.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  let sent = 0;
  let failed = 0;

  for (const entry of list) {
    if (entry.failed) {
      failed += 1;
      continue;
    }
    try {
      markAttempt(entry.clientRef);
      const res = await api.post<{ sale: Sale; duplicated: boolean }>(
        '/api/sales',
        entry.payload,
        { quiet: true },
      );
      removePending(entry.clientRef);
      sent += 1;
      window.dispatchEvent(new CustomEvent('pos:sale-synced', { detail: res.sale }));
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) {
        // Internet yo'q - keyinroq davom etamiz
        break;
      }
      if (err instanceof ApiError) {
        markFailed(entry.clientRef, err.message);
        failed += 1;
        continue;
      }
      break;
    }
  }

  return { sent, failed, remaining: listPending().length };
}
