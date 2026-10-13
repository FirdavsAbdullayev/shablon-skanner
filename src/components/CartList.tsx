import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { formatMoney, formatQty, formatUnit } from '../lib/format';
import type { CartItem } from '../store/cart.store';
import { EmptyState } from './ui';

type Props = {
  items: CartItem[];
  onIncrement: (productId: string, step: number) => void;
  onDecrement: (productId: string, step: number) => void;
  onRemove: (productId: string) => void;
  onPickEmpty?: () => void;
};

/** Og'irlik bilan sotiladigan mahsulotlar 0.5 qadam bilan o'zgaradi */
function stepFor(unit: string): number {
  return unit === 'kg' || unit === 'litr' || unit === 'g' || unit === 'ml' ? 0.5 : 1;
}

export function CartList({ items, onIncrement, onDecrement, onRemove, onPickEmpty }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="Savat bo'sh"
        description="Shtrix kodni skanerlang yoki qidiruv orqali mahsulot tanlang."
        action={
          onPickEmpty ? (
            <button
              type="button"
              onClick={onPickEmpty}
              className="text-sm font-semibold text-brand-400 hover:text-brand-300"
            >
              Mahsulot qidirish
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-700/50">
      {items.map((item, index) => {
        const step = stepFor(item.unit);
        const atMax = item.quantity >= item.stock;

        return (
          <li
            key={item.productId}
            className="animate-pop-in flex items-center gap-3 py-2.5"
            style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{item.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <span>{formatMoney(item.price)}</span>
                <span className="text-slate-600">/</span>
                <span>{formatUnit(item.unit)}</span>
                {atMax ? (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400">ombor chegarasi</span>
                  </>
                ) : null}
              </p>
            </div>

            {/* Miqdor boshqaruvi - katta, barmoq bilan bosish qulay */}
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-800 p-1">
              <button
                type="button"
                aria-label="Kamaytirish"
                onClick={() => onDecrement(item.productId, step)}
                className="grid size-9 place-items-center rounded-lg bg-slate-700 text-slate-100 active:bg-slate-600"
              >
                <Minus className="size-4" />
              </button>
              <span
                key={item.quantity}
                className="animate-bump min-w-10 text-center text-sm font-bold tabular-nums text-white"
              >
                {formatQty(item.quantity)}
              </span>
              <button
                type="button"
                aria-label="Ko'paytirish"
                onClick={() => onIncrement(item.productId, step)}
                disabled={atMax}
                className="grid size-9 place-items-center rounded-lg bg-brand-500 text-slate-950 active:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-white">
              {formatMoney(item.price * item.quantity)}
            </div>

            <button
              type="button"
              aria-label="Savatdan o'chirish"
              onClick={() => onRemove(item.productId)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
