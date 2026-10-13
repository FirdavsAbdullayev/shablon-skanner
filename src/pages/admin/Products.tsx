import {
  Barcode,
  Camera,
  Edit3,
  Filter,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Scanner } from '../../components/Scanner';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Select,
  Spinner,
  Switch,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { UNIT_OPTIONS, formatMoney, formatQty, formatUnit } from '../../lib/format';
import { toast } from '../../store/toast.store';
import type { Product, ProductListResponse } from '../../types/api';

type FormState = {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  price: string;
  costPrice: string;
  stock: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  barcode: '',
  category: '',
  unit: 'dona',
  price: '',
  costPrice: '',
  stock: '0',
};

/** Mahsulot qo'shish/tahrirlash oynasi */
function ProductFormModal({
  open,
  product,
  initialBarcode,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  initialBarcode?: string | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setScanning(false);
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        unit: product.unit,
        price: String(product.price),
        costPrice: product.costPrice != null ? String(product.costPrice) : '',
        stock: String(product.stock),
      });
    } else {
      setForm({ ...EMPTY_FORM, barcode: initialBarcode ?? '' });
    }
  }, [open, product, initialBarcode]);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Mahsulot nomini kiriting';
    if (!form.barcode.trim()) next.barcode = 'Shtrix kodni kiriting yoki skanerlang';
    const price = Number(form.price.replace(',', '.'));
    if (!form.price.trim() || !Number.isFinite(price) || price < 0) next.price = "To'g'ri narx kiriting";
    if (form.costPrice.trim()) {
      const cost = Number(form.costPrice.replace(',', '.'));
      if (!Number.isFinite(cost) || cost < 0) next.costPrice = "To'g'ri tannarx kiriting";
    }
    const stock = Number(form.stock.replace(',', '.'));
    if (form.stock.trim() && (!Number.isFinite(stock) || stock < 0)) next.stock = "To'g'ri miqdor kiriting";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim() || 'Umumiy',
      unit: form.unit || 'dona',
      price: Number(form.price.replace(',', '.')),
      costPrice: form.costPrice.trim() ? Number(form.costPrice.replace(',', '.')) : null,
      stock: form.stock.trim() ? Number(form.stock.replace(',', '.')) : 0,
    };

    try {
      if (product) {
        await api.patch(`/api/products/${product.id}`, payload);
        toast.success('Mahsulot yangilandi');
      } else {
        await api.post('/api/products', payload);
        toast.success('Mahsulot qo\u2019shildi');
      }
      onSaved();
      onClose();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'DUPLICATE_BARCODE') toast.error(errorMessage(err), 'Shtrix kod band');
      else toast.error(errorMessage(err), 'Saqlab bo\u2019lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sheet
      size="md"
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      description={product ? product.barcode : 'Shtrix kodni skanerlang yoki qo\u2019lda kiriting'}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="lg" loading={saving} onClick={() => void submit()}>
            Saqlash
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Input
          label="Mahsulot nomi *"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Masalan: Sut 1L"
          error={errors.name ?? null}
          autoFocus={!product}
        />

        <div className="flex items-end gap-2">
          <Input
            label="Shtrix kod *"
            value={form.barcode}
            onChange={(e) => set({ barcode: e.target.value })}
            placeholder="2000000000017"
            error={errors.barcode ?? null}
            className="font-mono"
            leftIcon={<Barcode className="size-4.5" />}
          />
          <Button
            variant="secondary"
            size="lg"
            className="mb-0.5 shrink-0"
            icon={<Camera className="size-5" />}
            onClick={() => setScanning(true)}
          >
            Skan
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Narx (sotish) *"
            value={form.price}
            onChange={(e) => set({ price: e.target.value })}
            placeholder="12000"
            inputMode="decimal"
            error={errors.price ?? null}
          />
          <Input
            label="Tannarx"
            value={form.costPrice}
            onChange={(e) => set({ costPrice: e.target.value })}
            placeholder="ixtiyoriy"
            inputMode="decimal"
            error={errors.costPrice ?? null}
            hint="Foyda hisoblash uchun"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="O'lchov birligi"
            value={form.unit}
            onChange={(e) => set({ unit: e.target.value })}
            options={UNIT_OPTIONS.map((u) => ({ value: u, label: formatUnit(u) }))}
          />
          <Input
            label="Ombordagi miqdor"
            value={form.stock}
            onChange={(e) => set({ stock: e.target.value })}
            placeholder="0"
            inputMode="decimal"
            error={errors.stock ?? null}
          />
        </div>

        <Input
          label="Kategoriya"
          value={form.category}
          onChange={(e) => set({ category: e.target.value })}
          placeholder="Ichimliklar"
          list="product-categories"
          hint="Mavjud kategoriyalardan tanlashingiz mumkin"
        />
        <datalist id="product-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {scanning ? (
          <div className="space-y-2 rounded-xl border border-slate-700 p-2">
            <Scanner
              className="h-52"
              onScan={(code) => {
                set({ barcode: code.trim() });
                setScanning(false);
                toast.success(`Shtrix kod o\u2019qildi: ${code}`, 'Skanerlandi');
              }}
            />
            <Button variant="ghost" fullWidth onClick={() => setScanning(false)}>
              Skanerni yopish
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/** Ombordagi miqdorni tez o'zgartirish */
function StockModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'delta' | 'set'>('delta');
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmount('');
    setMode('delta');
    setSign(1);
  }, [product]);

  const submit = async () => {
    if (!product) return;
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value === 0) {
      toast.warn('Miqdorni kiriting');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/products/${product.id}/stock`, {
        amount: mode === 'set' ? value : value * sign,
        mode,
      });
      toast.success('Ombor miqdori yangilandi');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err), 'Yangilab bo\u2019lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      sheet
      size="sm"
      title="Omborni yangilash"
      description={product ? `${product.name} · hozir ${formatQty(product.stock)} ${product.unit}` : ''}
      footer={
        <Button size="lg" fullWidth loading={saving} onClick={() => void submit()}>
          Saqlash
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('delta')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
              mode === 'delta'
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            Qo&rsquo;shish / ayirish
          </button>
          <button
            type="button"
            onClick={() => setMode('set')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
              mode === 'set'
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            Aniq miqdorni yozish
          </button>
        </div>

        {mode === 'delta' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSign(1)}
              className={`h-12 rounded-xl border text-sm font-semibold ${
                sign === 1 ? 'border-brand-500 bg-brand-500/15 text-brand-300' : 'border-slate-700 text-slate-300'
              }`}
            >
              + Qo&rsquo;shish
            </button>
            <button
              type="button"
              onClick={() => setSign(-1)}
              className={`h-12 rounded-xl border text-sm font-semibold ${
                sign === -1 ? 'border-rose-500 bg-rose-500/15 text-rose-300' : 'border-slate-700 text-slate-300'
              }`}
            >
              − Ayirish
            </button>
          </div>
        ) : null}

        <Input
          label="Miqdor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="10"
          autoFocus
        />

        <div className="flex flex-wrap gap-2">
          {[1, 5, 10, 24, 50, 100].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-brand-500/60 hover:text-brand-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function Products() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), 300);
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === '1');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [initialBarcode, setInitialBarcode] = useState<string | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category) params.set('category', category);
      if (lowStock) params.set('lowStock', '1');
      if (showInactive) params.set('includeInactive', '1');
      params.set('page', String(page));
      params.set('limit', '30');

      const res = await api.get<ProductListResponse>(`/api/products?${params.toString()}`);
      setData(res);
    } catch (err) {
      toast.error(errorMessage(err), 'Mahsulotlarni yuklab bo\u2019lmadi');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, lowStock, showInactive, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ items: { category: string }[] }>('/api/products/categories')
      .then((res) => setCategoryOptions(res.items.map((i) => i.category)))
      .catch(() => undefined);
  }, [data?.total]);

  // Kassa sahifasidan "Omborga qo'shish" bosilganda shu yerga kelinadi
  useEffect(() => {
    const state = location.state as { newBarcode?: string } | null;
    if (state?.newBarcode) {
      setEditing(null);
      setInitialBarcode(state.newBarcode);
      setFormOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    setLowStock(searchParams.get('lowStock') === '1');
  }, [searchParams]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.del<{ message: string }>(`/api/products/${deleteTarget.id}`);
      toast.success(res.message);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'O\u2019chirib bo\u2019lmadi');
    } finally {
      setDeleting(false);
    }
  };

  const categorySelectOptions = useMemo(
    () => [{ value: '', label: 'Barcha kategoriyalar' }, ...categoryOptions.map((c) => ({ value: c, label: c }))],
    [categoryOptions],
  );

  return (
    <div className="space-y-4">
      {/* Boshqaruv paneli */}
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nomi yoki shtrix kod bo'yicha qidirish"
            leftIcon={<Search className="size-4.5" />}
            containerClassName="md:max-w-md"
          />

          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            options={categorySelectOptions}
            containerClassName="md:max-w-56"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !lowStock;
                setLowStock(next);
                setPage(1);
                setSearchParams(next ? { lowStock: '1' } : {});
              }}
              className={`flex h-12 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium ${
                lowStock
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Filter className="size-4" /> Kam qolgan
            </button>

            <Button
              size="lg"
              className="flex-1 md:flex-none"
              icon={<Plus className="size-5" />}
              onClick={() => {
                setEditing(null);
                setInitialBarcode(null);
                setFormOpen(true);
              }}
            >
              Yangi mahsulot
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-slate-700/50 pt-3">
          <Switch checked={showInactive} onChange={(v) => { setShowInactive(v); setPage(1); }} label="Sotuvdan chiqarilganlarni ko'rsatish" />
          <span className="text-sm text-slate-400">Sotuvdan chiqarilganlarni ham ko&rsquo;rsatish</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            icon={<RefreshCw className="size-4" />}
            onClick={() => void load()}
          >
            Yangilash
          </Button>
        </div>
      </Card>

      {loading && !data ? <Spinner label="Yuklanmoqda..." /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={<Package className="size-7" />}
          title="Mahsulot topilmadi"
          description="Qidiruv shartlarini o'zgartiring yoki yangi mahsulot qo'shing."
          action={
            <Button
              icon={<Plus className="size-5" />}
              onClick={() => {
                setEditing(null);
                setInitialBarcode(null);
                setFormOpen(true);
              }}
            >
              Yangi mahsulot
            </Button>
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          {/* Kompyuter/planshet uchun jadval */}
          <Card padded={false} className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Mahsulot</th>
                  <th className="px-4 py-3 text-left font-medium">Shtrix kod</th>
                  <th className="px-4 py-3 text-right font-medium">Narx</th>
                  <th className="px-4 py-3 text-right font-medium">Tannarx</th>
                  <th className="px-4 py-3 text-right font-medium">Qoldiq</th>
                  <th className="px-4 py-3 text-right font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.category}
                        {!p.isActive ? ' · sotuvdan chiqarilgan' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.barcode}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-100">
                      {formatMoney(p.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {p.costPrice != null ? formatMoney(p.costPrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={p.stock <= 0 ? 'rose' : p.stock <= (data.threshold ?? 5) ? 'amber' : 'brand'}>
                        {formatQty(p.stock)} {formatUnit(p.unit)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="Omborni yangilash" size="sm" onClick={() => setStockTarget(p)}>
                          <PackagePlus className="size-4" />
                        </IconButton>
                        <IconButton label="Tahrirlash" size="sm" onClick={() => { setEditing(p); setInitialBarcode(null); setFormOpen(true); }}>
                          <Edit3 className="size-4" />
                        </IconButton>
                        <IconButton
                          label="O'chirish"
                          size="sm"
                          className="hover:bg-rose-500/10 hover:text-rose-400"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Telefon uchun kartalar */}
          <div className="space-y-2 md:hidden">
            {data.items.map((p) => (
              <Card key={p.id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-100">{p.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{p.barcode}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={p.stock <= 0 ? 'rose' : p.stock <= (data.threshold ?? 5) ? 'amber' : 'brand'}>
                      {formatQty(p.stock)} {formatUnit(p.unit)}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-200">{formatMoney(p.price)}</span>
                    <span className="text-xs text-slate-500">{p.category}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <IconButton label="Omborni yangilash" size="sm" onClick={() => setStockTarget(p)}>
                    <PackagePlus className="size-4" />
                  </IconButton>
                  <IconButton label="Tahrirlash" size="sm" onClick={() => { setEditing(p); setInitialBarcode(null); setFormOpen(true); }}>
                    <Edit3 className="size-4" />
                  </IconButton>
                  <IconButton
                    label="O'chirish"
                    size="sm"
                    className="hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => setDeleteTarget(p)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </Card>
            ))}
          </div>

          {/* Sahifalash */}
          {data.pages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Jami {data.total} ta · {data.page}/{data.pages} sahifa
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Keyingi
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ProductFormModal
        open={formOpen}
        product={editing}
        initialBarcode={initialBarcode}
        categories={categoryOptions}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
      />

      <StockModal product={stockTarget} onClose={() => setStockTarget(null)} onSaved={() => void load()} />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        sheet
        size="sm"
        title="Mahsulotni o'chirish"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button variant="danger" size="lg" loading={deleting} onClick={() => void handleDelete()}>
              O&rsquo;chirish
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{deleteTarget?.name}</span> mahsulotini o&rsquo;chirmoqchimisiz?
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Agar bu mahsulot sotilgan bo&rsquo;lsa, u butunlay o&rsquo;chirilmaydi — sotuv tarixi saqlanishi uchun
          &ldquo;sotuvdan chiqarilgan&rdquo; holatiga o&rsquo;tadi.
        </p>
      </Modal>
    </div>
  );
}
