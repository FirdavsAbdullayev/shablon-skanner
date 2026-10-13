import {
  AlertTriangle,
  ChevronLeft,
  CloudUpload,
  LayoutDashboard,
  LogOut,
  ScanBarcode,
  ShoppingCart,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartList } from '../../components/CartList';
import { CheckoutModal, type CheckoutSnapshot } from '../../components/CheckoutModal';
import { ProductSearch } from '../../components/ProductSearch';
import { ReceiptModal } from '../../components/ReceiptModal';
import { Scanner } from '../../components/Scanner';
import { Button, Modal } from '../../components/ui';
import { ApiError, api, errorMessage } from '../../lib/api';
import { feedback, unlockAudio } from '../../lib/beep';
import { formatMoney, formatQty } from '../../lib/format';
import { usePendingQueue } from '../../lib/hooks';
import type { ReceiptData } from '../../lib/receipt';
import { cartTotals, useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';
import type { Product, ProductByBarcodeResponse } from '../../types/api';

type ScanInfo = { kind: 'ok' | 'warn'; text: string } | null;

export function POS() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const items = useCartStore((s) => s.items);
  const addProduct = useCartStore((s) => s.add);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ data: ReceiptData; offline: boolean } | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<ScanInfo>(null);
  const [warnSignal, setWarnSignal] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'running' | 'error'>('starting');
  const searchRef = useRef<HTMLInputElement>(null);
  const scanTimer = useRef<number | null>(null);

  const totals = useMemo(() => cartTotals(items), [items]);

  const { count: pendingCount, online, syncing } = usePendingQueue((sent) =>
    toast.success(`${sent} ta oflayn chek serverga yuborildi`, 'Navbat tozalandi'),
  );

  /** Skaner natijasini qisqa vaqt ko'rsatish */
  const showScanInfo = useCallback((info: ScanInfo) => {
    setScanInfo(info);
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
    scanTimer.current = window.setTimeout(() => setScanInfo(null), 2600);
  }, []);

  /** Mahsulot topildi -> savatga qo'shish */
  const putInCart = useCallback(
    (product: Product) => {
      const result = addProduct(product, 1);

      if (!result.ok && result.reason === 'out-of-stock') {
        feedback('error');
        showScanInfo({ kind: 'warn', text: `${product.name} — omborda tugagan` });
        return;
      }

      if (result.reason === 'clamped') {
        feedback('warn');
        showScanInfo({
          kind: 'warn',
          text: `Omborda faqat ${formatQty(product.stock)} ${product.unit} bor: ${product.name}`,
        });
        return;
      }

      feedback('ok');
      showScanInfo({
        kind: 'ok',
        text: `${product.name} · ${formatMoney(product.price)} (${formatQty(result.quantity)} ${product.unit})`,
      });
    },
    [addProduct, showScanInfo],
  );

  /**
   * Shtrix kod bo'yicha mahsulotni topish.
   * Har doim serverdan ANIQ narx va qoldiqni olamiz - savatdagi eski
   * ma'lumot bilan ishlash xatolikka olib kelishi mumkin.
   */
  const handleBarcode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      try {
        const res = await api.get<ProductByBarcodeResponse>(
          `/api/products/barcode/${encodeURIComponent(code)}`,
        );
        putInCart(res.product);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'BARCODE_NOT_FOUND') {
          feedback('error');
          setWarnSignal((s) => s + 1);
          setUnknownBarcode(code);
          return;
        }
        if (err instanceof ApiError && err.code === 'PRODUCT_INACTIVE') {
          feedback('error');
          setWarnSignal((s) => s + 1);
          showScanInfo({ kind: 'warn', text: "Bu mahsulot sotuvdan chiqarilgan" });
          return;
        }
        feedback('error');
        setWarnSignal((s) => s + 1);
        showScanInfo({ kind: 'warn', text: errorMessage(err) });
      }
    },
    [putInCart, showScanInfo],
  );

  /**
   * USB / Bluetooth shtrix kod skaneri ("keyboard wedge") qo'llab-quvvatlashi:
   * skaner juda tez harflar terib, oxirida Enter yuboradi.
   * Boshqa inputlarga yozilayotgan bo'lsa - aralashmaymiz.
   */
  useEffect(() => {
    let buffer = '';
    let lastAt = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastAt > 350) buffer = '';
      lastAt = now;

      if (e.key === 'Enter') {
        const code = buffer.trim();
        buffer = '';
        if (code.length >= 6) {
          e.preventDefault();
          void handleBarcode(code);
        }
        return;
      }

      if (e.key === 'Backspace') {
        buffer = buffer.slice(0, -1);
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBarcode]);

  /** Brauzer ovozini "uyg'otish" (birinchi teginishda) */
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, []);

  const handleCompleted = (snapshot: CheckoutSnapshot) => {
    const data: ReceiptData = {
      storeName: user?.store?.name ?? 'Do\u2019kon',
      storePhone: user?.store?.phone ?? null,
      storeAddress: user?.store?.address ?? null,
      saleId: snapshot.sale?.id ?? snapshot.clientRef,
      createdAt: snapshot.sale?.createdAt ?? new Date().toISOString(),
      cashierName: user?.name ?? '',
      items: snapshot.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        lineTotal: Math.round(i.price * i.quantity * 100) / 100,
      })),
      total: snapshot.total,
      paymentMethod: snapshot.paymentMethod,
      amountPaid: snapshot.paymentMethod === 'CASH' ? snapshot.amountPaid : null,
      changeAmount: snapshot.paymentMethod === 'CASH' ? snapshot.changeAmount : null,
      currency: user?.store?.currency ?? 'UZS',
    };

    clear();
    setCheckoutOpen(false);
    setReceipt({ data, offline: snapshot.offline });
    showScanInfo(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/kirish', { replace: true });
  };

  return (
    <div className="flex h-screen-safe flex-col bg-surface-900">
      {/* ---------------- Yuqori panel ---------------- */}
      <header className="shrink-0 border-b border-slate-700/60 bg-surface-850 pt-safe">
        <div className="flex h-14 items-center gap-2 px-3">
          <span className="grid size-9 shrink-0 animate-in place-items-center rounded-xl bg-brand-500/15 text-brand-400">
            <ScanBarcode className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.store?.name ?? 'Do\u2019kon'}
            </p>
            <p className="truncate text-xs text-slate-400">
              {user?.name} · {user?.role === 'ADMIN' ? 'Administrator' : 'Kassir'}
            </p>
          </div>

          {syncing ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2 py-1 text-xs text-sky-300">
              <CloudUpload className="size-3.5 animate-pulse" />
              <span className="hidden sm:inline">Yuborilmoqda</span>
            </span>
          ) : null}

          {pendingCount > 0 && !syncing ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
              <CloudUpload className="size-3.5" /> {pendingCount}
            </span>
          ) : null}

          <span
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
              online ? 'bg-brand-500/15 text-brand-300' : 'bg-rose-500/15 text-rose-300'
            }`}
            title={online ? 'Internet bor' : "Internet yo'q"}
          >
            {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            <span className="hidden sm:inline">{online ? 'Onlayn' : 'Oflayn'}</span>
          </span>

          {user?.role === 'ADMIN' ? (
            <button
              type="button"
              aria-label="Boshqaruv paneli"
              title="Boshqaruv paneli"
              onClick={() => navigate('/admin')}
              className="grid size-10 place-items-center rounded-xl text-slate-300 hover:bg-slate-800"
            >
              <LayoutDashboard className="size-5" />
            </button>
          ) : null}

          <button
            type="button"
            aria-label="Chiqish"
            title="Chiqish"
            onClick={handleLogout}
            className="grid size-10 place-items-center rounded-xl text-slate-300 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* ---------------- Asosiy qism ---------------- */}
      <main className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] md:gap-4 md:p-4">
        {/* Skaner va qidiruv */}
        <section className="shrink-0 space-y-2 p-3 pb-2 md:space-y-3 md:p-0">
          {/* Kamera skaner — yoqish/o'chirish boshqaruvi */}
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <ScanBarcode className="size-3.5 text-brand-400" /> Kamera skaner
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={cameraOn}
              onClick={() => setCameraOn((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                cameraOn ? 'bg-brand-500/15 text-brand-300' : 'bg-slate-700/50 text-slate-300'
              }`}
            >
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  cameraOn ? 'bg-brand-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block size-3 transform rounded-full bg-white shadow transition-transform ${
                    cameraOn ? 'translate-x-[15px]' : 'translate-x-0.5'
                  }`}
                />
              </span>
              {cameraOn ? 'Yoqilgan' : "O'chirilgan"}
            </button>
          </div>

          <Scanner
            onScan={(code) => void handleBarcode(code)}
            paused={checkoutOpen || Boolean(receipt) || Boolean(unknownBarcode)}
            onStatusChange={setCameraStatus}
            warnSignal={warnSignal}
            enabled={cameraOn}
            onToggle={() => setCameraOn((v) => !v)}
            className="h-40 sm:h-52 md:h-56 lg:h-64"
          />

          <ProductSearch
            inputRef={searchRef}
            onPick={putInCart}
            onBarcodeNotFound={(code) => {
              feedback('error');
              setWarnSignal((s) => s + 1);
              setUnknownBarcode(code);
            }}
          />

          {/* Oxirgi skan natijasi */}
          {scanInfo ? (
            <div
              key={scanInfo.kind + scanInfo.text}
              className={[
                'flex animate-in items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                scanInfo.kind === 'ok'
                  ? 'border-brand-500/40 bg-brand-950/40 text-brand-200'
                  : 'border-amber-500/40 bg-amber-950/40 text-amber-200',
              ].join(' ')}
            >
              {scanInfo.kind === 'ok' ? (
                <ScanBarcode className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{scanInfo.text}</span>
            </div>
          ) : null}

          <p className="hidden text-xs text-slate-500 md:block">
            USB yoki Bluetooth skaner ham ishlaydi — u tergan kod avtomatik qabul qilinadi.
          </p>
        </section>

        {/* Savat */}
        <section className="flex min-h-0 flex-1 flex-col border-t border-slate-700/60 bg-surface-850 md:rounded-2xl md:border">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/60 px-3 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShoppingCart className="size-4 text-brand-400" />
              Savat
              {items.length > 0 ? (
                <span
                  key={totals.count}
                  className="animate-bump rounded-md bg-slate-700/70 px-1.5 py-0.5 text-xs text-slate-300"
                >
                  {formatQty(totals.count)}
                </span>
              ) : null}
            </h2>

            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clear();
                  showScanInfo(null);
                }}
                className="text-xs font-medium text-slate-400 hover:text-rose-300"
              >
                Savatni tozalash
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            <CartList
              items={items}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              onPickEmpty={() => searchRef.current?.focus()}
            />
          </div>

          {/* Jami va to'lov tugmasi - doim ekranning pastida */}
          <div className="shrink-0 border-t border-slate-700/60 bg-surface-800/80 px-3 py-3 pb-safe backdrop-blur">
            {cameraStatus === 'error' ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="size-3.5" />
                Kamera ishlamayapti — qidiruv maydonidan foydalaning
              </p>
            ) : null}

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-400">Umumiy summa</p>
                <p key={totals.total} className="animate-bump truncate text-2xl font-bold tabular-nums text-white">
                  {formatMoney(totals.total)}
                </p>
                <p key={totals.count} className="animate-in text-xs text-slate-400">
                  {items.length} xil · {formatQty(totals.count)} dona mahsulot
                </p>
              </div>

              <Button
                size="xl"
                disabled={items.length === 0}
                onClick={() => setCheckoutOpen(true)}
                icon={<ChevronLeft className="size-5 rotate-180" />}
                className={`shrink-0 transition-transform duration-150 active:scale-[0.96] ${
                  items.length > 0 ? 'animate-glow-pulse' : ''
                }`}
              >
                TO&rsquo;LOV
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- To'lov oynasi ---------------- */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        total={totals.total}
        online={online}
        onCompleted={handleCompleted}
      />

      {/* ---------------- Chek ---------------- */}
      <ReceiptModal
        open={Boolean(receipt)}
        data={receipt?.data ?? null}
        offline={receipt?.offline ?? false}
        onClose={() => setReceipt(null)}
        onNewSale={() => {
          setReceipt(null);
          window.setTimeout(() => searchRef.current?.focus(), 120);
        }}
      />

      {/* ---------------- Noma'lum shtrix kod ---------------- */}
      <Modal
        open={Boolean(unknownBarcode)}
        onClose={() => setUnknownBarcode(null)}
        sheet
        size="sm"
        title="Mahsulot topilmadi"
        description={
          <span className="font-mono text-slate-300">{unknownBarcode}</span>
        }
        footer={
          user?.role === 'ADMIN' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => setUnknownBarcode(null)}>
                Yopish
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  const code = unknownBarcode;
                  setUnknownBarcode(null);
                  navigate('/admin/mahsulotlar', { state: { newBarcode: code } });
                }}
              >
                Omborga qo&rsquo;shish
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="lg" fullWidth onClick={() => setUnknownBarcode(null)}>
              Yopish
            </Button>
          )
        }
      >
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Bu shtrix kod bazada yo&rsquo;q. Mahsulot hali omborga kiritilmagan bo&rsquo;lishi mumkin.
          </p>
          {user?.role === 'ADMIN' ? (
            <p className="rounded-xl border border-brand-500/30 bg-brand-950/30 p-3 text-brand-200">
              Administrator sifatida siz bu mahsulotni darhol omborga qo&rsquo;shishingiz mumkin — shtrix kod
              avtomatik to&rsquo;ldiriladi.
            </p>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-amber-200">
              Noma&rsquo;lum shtrix kod. Administratorga xabar bering yoki qidiruv maydonidan mahsulotni
              qo&rsquo;lda toping.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
