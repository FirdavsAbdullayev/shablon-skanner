import {
  Ban,
  CalendarDays,
  Coins,
  Eye,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ReceiptModal } from '../../components/ReceiptModal';
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
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import {
  daysAgoInput,
  formatDateTime,
  formatMoney,
  formatPaymentMethod,
  formatQty,
  formatUnit,
  todayInput,
} from '../../lib/format';
import type { ReceiptData } from '../../lib/receipt';
import { shortId } from '../../lib/receipt';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import type { Sale, SalesListResponse, User, UsersResponse } from '../../types/api';

function saleToReceipt(sale: Sale, storeName: string, storePhone: string | null): ReceiptData {
  return {
    storeName,
    storePhone,
    storeAddress: null,
    saleId: sale.id,
    createdAt: sale.createdAt,
    cashierName: sale.cashier?.name ?? '—',
    items: sale.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      lineTotal: i.lineTotal,
    })),
    total: sale.totalAmount,
    paymentMethod: sale.paymentMethod,
    amountPaid: sale.amountPaid,
    changeAmount: sale.changeAmount,
    currency: 'UZS',
  };
}

export function SalesHistory() {
  const [from, setFrom] = useState(daysAgoInput(6));
  const [to, setTo] = useState(todayInput());
  const [cashierId, setCashierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<SalesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ all: '1', page: String(page), limit: '30' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (cashierId) params.set('cashierId', cashierId);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);

      const res = await api.get<SalesListResponse>(`/api/sales?${params.toString()}`);
      setData(res);
    } catch (err) {
      toast.error(errorMessage(err), 'Sotuvlarni yuklab bo\u2019lmadi');
    } finally {
      setLoading(false);
    }
  }, [from, to, cashierId, paymentMethod, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<UsersResponse>('/api/users?role=CASHIER')
      .then((res) => setCashiers(res.items))
      .catch(() => undefined);
  }, []);

  const store = useAuthStore((s) => s.user?.store);

  const openReceipt = (sale: Sale) => {
    setReceipt(saleToReceipt(sale, store?.name ?? 'Do\u2019kon', store?.phone ?? null));
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await api.del<{ message: string }>(`/api/sales/${voidTarget.id}`);
      toast.success(res.message);
      setVoidTarget(null);
      setDetail(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'Bekor qilib bo\u2019lmadi');
    } finally {
      setVoiding(false);
    }
  };

  const currency = 'UZS';

  return (
    <div className="space-y-4">
      {/* Filtrlar */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Boshlanish sanasi"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Tugash sanasi"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Kassir"
            value={cashierId}
            onChange={(e) => {
              setCashierId(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Barcha kassirlar' },
              ...cashiers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="To'lov turi"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Barchasi' },
              { value: 'CASH', label: 'Naqd' },
              { value: 'CARD', label: 'Karta' },
              { value: 'QR', label: 'QR to\u2019lov' },
            ]}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700/50 pt-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<CalendarDays className="size-4" />}
            onClick={() => {
              setFrom(todayInput());
              setTo(todayInput());
              setPage(1);
            }}
          >
            Bugun
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom(daysAgoInput(6));
              setTo(todayInput());
              setPage(1);
            }}
          >
            Oxirgi 7 kun
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom(daysAgoInput(29));
              setTo(todayInput());
              setPage(1);
            }}
          >
            Oxirgi 30 kun
          </Button>
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

      {/* Davr bo'yicha jamlanma */}
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 sm:text-xs">Tushum</p>
              <p className="truncate text-base font-bold tabular-nums text-white sm:text-lg">{formatMoney(data.summary.revenue, currency)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
              <Coins className="size-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 sm:text-xs">Foyda</p>
              <p className="truncate text-base font-bold tabular-nums text-violet-300 sm:text-lg">{formatMoney(data.summary.profit, currency)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
              <ReceiptText className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Cheklar</p>
              <p className="text-lg font-bold text-white">{data.summary.salesCount}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
              <ShoppingBag className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Mahsulot</p>
              <p className="text-lg font-bold text-white">{formatQty(data.summary.itemsSold)}</p>
            </div>
          </Card>
        </div>
      ) : null}

      {loading && !data ? <Spinner label="Yuklanmoqda..." /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-7" />}
          title="Bu davrda sotuv topilmadi"
          description="Sanani yoki filtrlarni o'zgartirib ko'ring."
        />
      ) : null}

      {/* Sotuvlar ro'yxati */}
      {data && data.items.length > 0 ? (
        <>
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-slate-700/50">
              {data.items.map((sale) => (
                <li key={sale.id} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-800/40 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-300">{shortId(sale.id)}</span>
                      <Badge
                        tone={
                          sale.paymentMethod === 'CASH' ? 'brand' : sale.paymentMethod === 'CARD' ? 'sky' : 'violet'
                        }
                      >
                        {formatPaymentMethod(sale.paymentMethod)}
                      </Badge>
                      {sale.clientRef?.startsWith('off-') ? <Badge tone="amber">oflayn</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      <UserIcon className="mr-1 inline size-3" />
                      {sale.cashier?.name ?? '—'} · {formatDateTime(sale.createdAt)} · {sale.items.length} xil
                      mahsulot
                    </p>
                  </div>

                  <span className="shrink-0 text-right text-sm font-bold text-white">
                    {formatMoney(sale.totalAmount, currency)}
                  </span>

                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Chekni ko'rish" size="sm" onClick={() => setDetail(sale)}>
                      <Eye className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Chekni bekor qilish"
                      size="sm"
                      className="hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => setVoidTarget(sale)}
                    >
                      <Ban className="size-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {data.pages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Jami {data.total} ta chek · {data.page}/{data.pages}
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

      {/* Chek tafsiloti */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        sheet
        size="md"
        title={detail ? `Chek ${shortId(detail.id)}` : ''}
        description={detail ? formatDateTime(detail.createdAt) : ''}
        footer={
          detail ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                icon={<ReceiptText className="size-4" />}
                onClick={() => {
                  const sale = detail;
                  setDetail(null);
                  openReceipt(sale);
                }}
              >
                Chekni chiqarish
              </Button>
              <Button variant="danger" size="lg" icon={<Ban className="size-4" />} onClick={() => setVoidTarget(detail)}>
                Bekor qilish
              </Button>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">Kassir</p>
                <p className="font-semibold text-white">{detail.cashier?.name ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">To&rsquo;lov turi</p>
                <p className="font-semibold text-white">{formatPaymentMethod(detail.paymentMethod)}</p>
              </div>
            </div>

            <ul className="divide-y divide-slate-700/50 rounded-xl border border-slate-700">
              {detail.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">{item.productName}</p>
                    <p className="text-xs text-slate-500">
                      {formatQty(item.quantity)} {formatUnit(item.unit)} × {formatMoney(item.price)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-white">
                    {formatMoney(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Jami</span>
                <span className="text-base font-bold text-white">{formatMoney(detail.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Foyda</span>
                <span className="font-semibold text-brand-400">{formatMoney(detail.profitAmount)}</span>
              </div>
              {detail.paymentMethod === 'CASH' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">To&rsquo;langan</span>
                    <span className="text-slate-200">{formatMoney(detail.amountPaid ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Qaytim</span>
                    <span className="text-slate-200">{formatMoney(detail.changeAmount ?? 0)}</span>
                  </div>
                </>
              ) : null}
            </div>

            {detail.note ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-300">
                Izoh: {detail.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Chekni bekor qilish */}
      <Modal
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        sheet
        size="sm"
        title="Chekni bekor qilish"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => setVoidTarget(null)}>
              Yopish
            </Button>
            <Button variant="danger" size="lg" loading={voiding} onClick={() => void handleVoid()}>
              Bekor qilish
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          {voidTarget ? `${shortId(voidTarget.id)} cheki o'chiriladi va ` : ''}
          mahsulotlar omborga qaytariladi. Bu amalni ortga qaytarib bo&rsquo;lmaydi.
        </p>
      </Modal>

      {/* Chekni ko'rish/chop etish */}
      <ReceiptModal
        open={Boolean(receipt)}
        data={receipt}
        offline={false}
        onClose={() => setReceipt(null)}
        onNewSale={() => setReceipt(null)}
      />
    </div>
  );
}
