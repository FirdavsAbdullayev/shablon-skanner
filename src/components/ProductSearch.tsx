import { Barcode, Loader2, Package, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { api } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { formatMoney, formatQty } from '../lib/format';
import type { Product, ProductByBarcodeResponse, ProductListResponse } from '../types/api';
import { Badge, Input } from './ui';

type Props = {
  onPick: (product: Product) => void;
  onBarcodeNotFound: (barcode: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
};

/**
 * Qidiruv: mahsulot NOMI yoki SHTRIX KODI bo'yicha.
 * Shtrix kod terilib Enter bosilsa - to'g'ridan-to'g'ri barcode bo'yicha qidiradi
 * (USB/Bluetooth skaner ham xuddi shunday ishlaydi: u matn terib Enter bosadi).
 */
export function ProductSearch({
  onPick,
  onBarcodeNotFound,
  inputRef,
  placeholder = 'Nomi yoki shtrix kodini kiriting...',
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyBarcode, setBusyBarcode] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounced = useDebounced(query.trim(), 280);
  const abortRef = useRef<AbortController | null>(null);
  const listId = 'pos-search-results';

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    api
      .get<ProductListResponse>(
        `/api/products?search=${encodeURIComponent(debounced)}&limit=8&sort=name`,
        { signal: controller.signal },
      )
      .then((res) => {
        setResults(res.items);
        setHighlight(0);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced]);

  /** Shtrix kod bo'yicha aniq qidiruv */
  const lookupBarcode = useCallback(
    async (code: string) => {
      const barcode = code.trim();
      if (!barcode) return;
      setBusyBarcode(true);
      try {
        const res = await api.get<ProductByBarcodeResponse>(
          `/api/products/barcode/${encodeURIComponent(barcode)}`,
        );
        onPick(res.product);
        setQuery('');
        setResults([]);
      } catch (err) {
        const code_name = (err as { code?: string }).code;
        if (code_name === 'BARCODE_NOT_FOUND') {
          onBarcodeNotFound(barcode);
          setQuery('');
          setResults([]);
        }
      } finally {
        setBusyBarcode(false);
      }
    },
    [onBarcodeNotFound, onPick],
  );

  const submit = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text) return;
      // Avval shtrix kod sifatida urinib ko'ramiz (skaner shu yo'lni ishlatadi)
      if (/^[0-9A-Za-z\-_.]{4,}$/.test(text) && !/[a-zA-Zа-яА-Я]{4,}/.test(text)) {
        await lookupBarcode(text);
        return;
      }
      if (results[highlight]) {
        onPick(results[highlight]!);
        setQuery('');
        setResults([]);
        return;
      }
      if (results.length > 0) {
        onPick(results[0]!);
        setQuery('');
        setResults([]);
        return;
      }
      // Oxirgi urinish: aniq shtrix kod bo'lishi mumkin
      await lookupBarcode(text);
    },
    [highlight, lookupBarcode, onPick, results],
  );

  const open = focused && query.trim().length >= 2;
  const empty = open && !loading && results.length === 0;

  const options = useMemo(
    () => (results.length > 0 ? results : []),
    [results],
  );

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 180)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit(query);
          } else if (e.key === 'ArrowDown' && options.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h + 1) % options.length);
          } else if (e.key === 'ArrowUp' && options.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h - 1 + options.length) % options.length);
          } else if (e.key === 'Escape') {
            setQuery('');
            setResults([]);
          }
        }}
        placeholder={placeholder}
        inputMode="search"
        autoComplete="off"
        leftIcon={<Search className="size-4.5" />}
        aria-autocomplete="list"
        aria-controls={listId}
        rightSlot={
          busyBarcode || loading ? (
            <Loader2 className="size-5 animate-spin text-slate-400" />
          ) : query ? (
            <button
              type="button"
              aria-label="Tozalash"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef?.current?.focus();
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          ) : null
        }
      />

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-700 bg-surface-800 p-1.5 shadow-2xl"
        >
          {loading && results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Qidirilmoqda...</p>
          ) : null}

          {empty ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-slate-300">Mahsulot topilmadi</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Shtrix kod: <span className="font-mono">{query.trim()}</span>
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onBarcodeNotFound(query.trim());
                  setQuery('');
                }}
                className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                Omborga qo&rsquo;shish uchun bosing
              </button>
            </div>
          ) : null}

          {options.map((product, index) => (
            <button
              key={product.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(product);
                setQuery('');
                setResults([]);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                index === highlight ? 'bg-brand-500/15' : 'hover:bg-slate-700/60'
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-700/60 text-slate-300">
                <Package className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{product.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <Barcode className="size-3.5" />
                  <span className="font-mono">{product.barcode}</span>
                  <span className="text-slate-500">•</span>
                  <span>
                    {formatQty(product.stock)} {product.unit}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-brand-400">
                  {formatMoney(product.price)}
                </span>
                {product.stock <= 0 ? (
                  <Badge tone="rose" className="mt-0.5">
                    tugagan
                  </Badge>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
