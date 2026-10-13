import { ApiError, api } from './api';
import { addPending, type PendingSalePayload } from './queue';
import type { Sale, SaleResponse } from '../types/api';

export type SubmitSaleResult = {
  sale: Sale | null;
  /** Internet yo'q edi -> chek navbatga saqlandi */
  offline: boolean;
  duplicated: boolean;
};

/**
 * Sotuvni serverga yuborish.
 * Agar internet bo'lmasa, chek localStorage navbatiga qo'shiladi va
 * aloqa tiklanganda avtomatik yuboriladi (clientRef tufayli dublikat bo'lmaydi).
 */
export async function submitSale(payload: PendingSalePayload, total: number): Promise<SubmitSaleResult> {
  try {
    const res = await api.post<SaleResponse>('/api/sales', payload);
    return { sale: res.sale, offline: false, duplicated: res.duplicated };
  } catch (err) {
    if (err instanceof ApiError && err.isNetwork) {
      addPending({
        clientRef: payload.clientRef,
        createdAt: new Date().toISOString(),
        total,
        payload,
        attempts: 0,
        failed: null,
      });
      return { sale: null, offline: true, duplicated: false };
    }
    throw err;
  }
}
