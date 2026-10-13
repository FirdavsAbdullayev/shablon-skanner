import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  Coins,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardTitle, EmptyState, Spinner, StatCard } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatMoney, formatPaymentMethod, formatQty, formatUnit } from '../../lib/format';
import { toast } from '../../store/toast.store';
import type { DashboardStats } from '../../types/api';

function WeekChart({ data }: { data: DashboardStats['week'] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const total = data.reduce((a, d) => a + d.revenue, 0);

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((day, index) => {
          const height = day.revenue === 0 ? 2 : Math.max(6, (day.revenue / max) * 100);
          const isToday = day.date === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={day.date}
              className="group animate-in flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span className="text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                {formatMoney(day.revenue)}
              </span>
              <div
                className={`w-full rounded-t-lg transition-colors ${
                  isToday
                    ? 'bg-gradient-to-t from-brand-600 to-brand-300'
                    : 'bg-gradient-to-t from-slate-600 to-slate-500 group-hover:from-brand-700 group-hover:to-brand-500'
                }`}
                style={{ height: `${height}%` }}
                title={`${day.label}: ${formatMoney(day.revenue)} · foyda ${formatMoney(day.profit)}`}
              />
              <span className={`text-[10px] ${isToday ? 'font-bold text-brand-400' : 'text-slate-500'}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        7 kunlik tushum: <span className="font-semibold text-slate-200">{formatMoney(total)}</span>
      </p>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DashboardStats>('/api/reports/dashboard');
      setStats(res);
    } catch (err) {
      toast.error(errorMessage(err), 'Statistikani yuklab bo\u2019lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) return <Spinner label="Statistika yuklanmoqda..." />;
  if (!stats) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-7" />}
        title="Ma'lumot yuklanmadi"
        action={
          <Button onClick={() => void load()} icon={<RefreshCw className="size-4" />}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const maxPayment = Math.max(...stats.payments.map((p) => p.total), 1);
  const currency = stats.store?.currency ?? 'UZS';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Bugungi ko'rsatkichlar */}
      <div className="animate-in grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="animate-rise" style={{ animationDelay: '0ms' }}>
          <StatCard
            label="Bugungi tushum"
            value={formatMoney(stats.today.revenue, currency)}
            sub={`${stats.today.salesCount} ta sotuv`}
            icon={<BadgeDollarSign className="size-5" />}
            tone="brand"
          />
        </div>
        <div className="animate-rise" style={{ animationDelay: '60ms' }}>
          <StatCard
            label="Bugungi foyda"
            value={formatMoney(stats.today.profit, currency)}
            sub={stats.today.revenue > 0 ? `${Math.round((stats.today.profit / stats.today.revenue) * 100)}% marja` : '—'}
            icon={<Coins className="size-5" />}
            tone="violet"
          />
        </div>
        <div className="animate-rise" style={{ animationDelay: '120ms' }}>
          <StatCard
            label="Sotilgan mahsulot"
            value={formatQty(stats.today.itemsSold)}
            sub={`${stats.inventory.totalProducts} xil mahsulot bor`}
            icon={<ShoppingBag className="size-5" />}
            tone="blue"
          />
        </div>
        <div className="animate-rise" style={{ animationDelay: '180ms' }}>
          <StatCard
            label="Kam qolgan"
            value={String(stats.inventory.lowStockCount)}
            sub={`chegara: ${stats.inventory.threshold} dan kam`}
            icon={<AlertTriangle className="size-5" />}
            tone={stats.inventory.lowStockCount > 0 ? 'amber' : 'brand'}
            onClick={() => navigate('/admin/mahsulotlar?lowStock=1')}
          />
        </div>
      </div>

      <div className="animate-rise grid gap-4 lg:grid-cols-3">
        {/* 7 kunlik grafik */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<TrendingUp className="size-4" />} action={
            <Button variant="ghost" size="sm" onClick={() => void load()} icon={<RefreshCw className="size-4" />}>
              Yangilash
            </Button>
          }>
            Oxirgi 7 kun
          </CardTitle>
          <WeekChart data={stats.week} />
        </Card>

        {/* To'lov turlari */}
        <Card>
          <CardTitle icon={<BadgeDollarSign className="size-4" />}>To&rsquo;lov turlari (bugun)</CardTitle>
          <div className="space-y-3">
            {stats.payments.map((p) => (
              <div key={p.method}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{formatPaymentMethod(p.method)}</span>
                  <span className="font-semibold text-white">{formatMoney(p.total, currency)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-700/60">
                  <div
                    className="h-full animate-in rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                    style={{ width: `${Math.max(2, (p.total / maxPayment) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.count} ta sotuv</p>
              </div>
            ))}
            {stats.payments.every((p) => p.total === 0) ? (
              <p className="py-4 text-center text-sm text-slate-500">Bugun hali sotuv bo&rsquo;lmadi</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="animate-rise grid gap-4 lg:grid-cols-2">
        {/* Kam qolgan mahsulotlar */}
        <Card>
          <CardTitle
            icon={<Boxes className="size-4" />}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/mahsulotlar?lowStock=1')}
              >
                Barchasi
              </Button>
            }
          >
            Omborni to&rsquo;ldirish kerak
          </CardTitle>

          {stats.inventory.lowStockItems.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 py-6 text-center text-sm text-slate-400">
              <CheckCircle2 className="size-4 text-brand-400" /> Barcha mahsulotlar yetarli miqdorda
            </p>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {stats.inventory.lowStockItems.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.category} · <span className="font-mono">{p.barcode}</span>
                    </p>
                  </div>
                  <Badge tone={p.stock <= 0 ? 'rose' : 'amber'}>
                    {formatQty(p.stock)} {formatUnit(p.unit)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Eng ko'p sotilganlar */}
        <Card>
          <CardTitle icon={<Package className="size-4" />}>Bugun eng ko&rsquo;p sotilgan</CardTitle>
          {stats.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Bugun hali sotuv bo&rsquo;lmadi</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.topProducts.map((p, index) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-700/60 text-xs font-bold text-slate-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-500">{formatQty(p.quantity)} dona sotildi</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-brand-400">
                    {formatMoney(p.revenue, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
