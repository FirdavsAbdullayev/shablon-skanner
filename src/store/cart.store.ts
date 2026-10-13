import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types/api';

export type CartItem = {
  productId: string;
  barcode: string;
  name: string;
  unit: string;
  price: number;
  costPrice: number | null;
  stock: number;
  quantity: number;
};

export type AddResult = {
  ok: boolean;
  reason?: 'out-of-stock' | 'clamped';
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string, step?: number) => void;
  decrement: (productId: string, step?: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

function clampToStock(quantity: number, stock: number): number {
  const rounded = Math.round(quantity * 1000) / 1000;
  if (rounded < 0) return 0;
  return Math.min(rounded, stock);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add(product, quantity = 1) {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id);

        if (product.stock <= 0) {
          return { ok: false, reason: 'out-of-stock', quantity: 0 };
        }

        const wanted = (existing?.quantity ?? 0) + quantity;
        const finalQty = clampToStock(wanted, product.stock);
        const clamped = finalQty < wanted;

        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: finalQty, stock: product.stock, price: product.price }
                : i,
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                productId: product.id,
                barcode: product.barcode,
                name: product.name,
                unit: product.unit,
                price: product.price,
                costPrice: product.costPrice,
                stock: product.stock,
                quantity: finalQty,
              },
            ],
          });
        }

        return {
          ok: true,
          ...(clamped ? { reason: 'clamped' as const } : {}),
          quantity: finalQty,
        };
      },

      setQuantity(productId, quantity) {
        set({
          items: get()
            .items.map((i) =>
              i.productId === productId ? { ...i, quantity: clampToStock(quantity, i.stock) } : i,
            )
            .filter((i) => i.quantity > 0),
        });
      },

      increment(productId, step = 1) {
        const item = get().items.find((i) => i.productId === productId);
        if (!item) return;
        set({
          items: get().items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: clampToStock(i.quantity + step, i.stock) }
              : i,
          ),
        });
      },

      decrement(productId, step = 1) {
        const item = get().items.find((i) => i.productId === productId);
        if (!item) return;
        const next = Math.round((item.quantity - step) * 1000) / 1000;
        if (next <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, quantity: next } : i)),
        });
      },

      remove(productId) {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      clear() {
        set({ items: [] });
      },
    }),
    {
      name: 'pos.cart',
      // Savat telefon qulflangan/o'chib yonsa ham yo'qolmasligi uchun saqlanadi
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function cartTotals(items: CartItem[]): { total: number; count: number; cost: number } {
  let total = 0;
  let count = 0;
  let cost = 0;
  for (const item of items) {
    total += item.price * item.quantity;
    cost += (item.costPrice ?? 0) * item.quantity;
    count += item.quantity;
  }
  return {
    total: Math.round(total * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    count: Math.round(count * 1000) / 1000,
  };
}
