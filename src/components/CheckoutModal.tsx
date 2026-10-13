import { Banknote, CreditCard, Delete, QrCode, WifiOff, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../lib/api';
import { feedback } from '../lib/beep';
import { formatMoney, formatQty } from '../lib/format';
import { newClientRef } from '../lib/queue';
import { submitSale } from '../lib/sales';
import type { CartItem } from '../store/cart.store';
import { toast } from '../store/toast.store';
import type { PaymentMethod, Sale } from '../types/api';
import { Button, Modal } from './ui';

export type CheckoutSnapshot = {
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  clientRef: string;
  offline: boolean;
  sale: Sale | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  online: boolean;
  onCompleted: (snapshot: CheckoutSnapshot) => void;
};

const METHODS: { value: PaymentMethod; label: string; hint: string; icon: typeof Banknote }[] = [
  { value: 'CASH', label: 'Naqd', hint: 'Qaytim hisoblanadi', icon: Banknote },
  { value: 'CARD', label: 'Karta', hint: 'Terminal orqali', icon: CreditCard },
  { value: 'QR', label: 'QR to\u2019lov', hint: 'Telefon orqali', icon: QrCode },
];

/** Tez tanlash uchun yumaloqlangan summalar */
function quickAmounts(total: number): number[] {
  const roundUp = (step: number) => Math.ceil(total / step) * step;
  const set = new Set<number>([total, roundUp(5000), roundUp(10000), roundUp(50000), 100000, 200000]);
  return [...set].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 6);
}

export function CheckoutModal({ open, onClose, items, total, online, onCompleted }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidInput, setPaidInput] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Oyna har ochilganda holatni tozalash
  useEffect(() => {
    if (!open) return;
    setMethod('CASH');
    setPaidInput('');
    setNote('');
    setShowNote(false);
    setSubmitting(false);
  }, [open]);

  const amountPaid = useMemo(() => {
    const n = Number(paidInput.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, [paidInput]);

  const change = Math.max(0, amountPaid - total);
  const cashReady = method !== 'CASH' || amountPaid >= total;
  const canSubmit = items.length > 0 && cashReady && !submitting;

  const pressKey = (key: string) => {
    if (key === 'del') {
      setPaidInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setPaidInput('');
      return;
    }
    setPaidInput((prev) => {
      const next = `${prev}${key}`.replace(/^0+(?=\d)/, '');
      return next.slice(0, 12);
    });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const clientRef = newClientRef();
    const finalPaid = method === 'CASH' ? amountPaid : total;

    try {
      const result = await submitSale(
        {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: method,
          amountPaid: method === 'CASH' ? finalPaid : null,
          note: note.trim() || null,
          clientRef,
        },
        total,
      );

      feedback('cash');
      onCompleted({
        items,
        total,
        paymentMethod: method,
        amountPaid: finalPaid,
        changeAmount: method === 'CASH' ? finalPaid - total : 0,
        clientRef,
        offline: result.offline,
        sale: result.sale,
      });
    } catch (err) {
      feedback('error');
      const details = (err as { details?: { name?: string; available?: number; unit?: string } }).details;
      if (details?.name) {
        toast.error(
          `${details.name}: omborda ${formatQty(details.available ?? 0)} ${details.unit ?? ''} qoldi`,
          'Omborda yetarli emas',
        );
      } else {
        toast.error(errorMessage(err), 'Sotuvni yakunlab bo\u2019lmadi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sheet
      size="md"
      title="To\u2019lov"
      description={`${items.length} xil mahsulot`}
      footer={
        <div className="space-y-2">
          {!online ? (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-amber-950/50 px-3 py-2 text-xs text-amber-200">
              <WifiOff className="size-4" /> Internet yo&rsquo;q — chek saqlanadi va keyinroq yuboriladi
            </p>
          ) : null}
          <Button
            size="xl"
            fullWidth
            onClick={() => void submit()}
            loading={submitting}
            disabled={!canSubmit}
          >
            Sotuvni yakunlash · {formatMoney(total)}
          </Button>
        </div>
      }
    >
      {/* To'lov turini tanlash */}
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const active = method === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors',
                active
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600',
              ].join(' ')}
            >
              <Icon className="size-6" />
              <span className="text-sm font-semibold">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Jami summa */}
      <div className="mt-3.5 rounded-2xl border border-slate-700 bg-slate-900/60 p-3.5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Jami to&rsquo;lov</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-white sm:text-3xl">{formatMoney(total)}</p>
      </div>

      {/* Naqd uchun kalkulyator */}
      {method === 'CASH' ? (
        <div className="mt-3.5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts(total).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setPaidInput(String(amount))}
                className="rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-200 hover:border-brand-500/60 hover:text-brand-300"
              >
                {formatMoney(amount)}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Mijoz berdi</span>
              <span className="text-lg font-bold text-white">
                {paidInput ? formatMoney(amountPaid) : '—'}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-700/60 pt-2">
              <span className="text-sm text-slate-400">Qaytim</span>
              <span
                className={`text-xl font-bold ${change > 0 ? 'text-brand-400' : 'text-slate-500'}`}
              >
                {formatMoney(change)}
              </span>
            </div>
          </div>

          {/* Raqamli klaviatura - barmoq bilan bosish uchun katta */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => pressKey(key)}
                className="h-14 rounded-xl border border-slate-700 bg-slate-800 text-xl font-semibold text-white active:bg-slate-700"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pressKey('del')}
              aria-label="O'chirish"
              className="grid h-14 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-white active:bg-slate-700"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => pressKey('clear')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            <X className="size-4" /> Summani tozalash
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center text-sm text-slate-300">
          {method === 'CARD'
            ? 'Karta orqali to\u2019lovni terminalda tasdiqlang, so\u2019ng sotuvni yakunlang.'
            : 'QR kodni mijozga ko\u2019rsating, to\u2019lov tasdiqlangach sotuvni yakunlang.'}
        </p>
      )}

      {/* Izoh (ixtiyoriy) */}
      <div className="mt-3.5">
        {showNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Chek uchun izoh (ixtiyoriy)"
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            + Izoh qo&rsquo;shish
          </button>
        )}
      </div>
    </Modal>
  );
}
