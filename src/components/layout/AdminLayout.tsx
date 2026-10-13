import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ScanBarcode,
  Settings,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePendingQueue } from '../../lib/hooks';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';
import { Badge } from '../ui';

const NAV = [
  { to: '/admin', label: 'Boshqaruv paneli', icon: LayoutDashboard, end: true },
  { to: '/admin/mahsulotlar', label: 'Mahsulotlar', icon: Package, end: false },
  { to: '/admin/kassirlar', label: 'Kassirlar', icon: Users, end: false },
  { to: '/admin/sotuvlar', label: 'Sotuvlar tarixi', icon: ReceiptText, end: false },
  { to: '/admin/sozlamalar', label: 'Sozlamalar', icon: Settings, end: false },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { count: pendingCount, online } = usePendingQueue((sent) =>
    toast.success(`${sent} ta oflayn chek yuborildi`, 'Navbat tozalandi'),
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/kirish', { replace: true });
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="size-5 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}

      <div className="my-2 border-t border-slate-700/60" />

      <NavLink
        to="/kassa"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <ScanBarcode className="size-5 shrink-0 text-brand-400" />
        Kassaga o&rsquo;tish
      </NavLink>
    </nav>
  );

  return (
    <div className="min-h-screen-safe bg-surface-900">
      {/* Kompyuter/planshet uchun yon panel */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-700/60 bg-surface-850 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-slate-950">
            <ReceiptText className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Shablon POS</p>
            <p className="truncate text-xs text-slate-400">{user?.store?.name ?? 'Do\u2019kon'}</p>
          </div>
        </div>

        {nav}

        <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">@{user?.username} · Administrator</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:border-rose-500/50 hover:text-rose-300"
          >
            <LogOut className="size-4" /> Chiqish
          </button>
        </div>
      </aside>

      {/* Mobil menyu */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-backdrop absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-drawer-in absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-700/60 bg-surface-850 p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-slate-950">
            <ReceiptText className="size-5" />
          </span>
                <div>
                  <p className="text-sm font-bold text-white">Shablon POS</p>
                  <p className="truncate text-xs text-slate-400">{user?.store?.name}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Menyuni yopish"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            {nav}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:border-rose-500/50 hover:text-rose-300"
            >
              <LogOut className="size-4" /> Chiqish
            </button>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Yuqori sarlavha */}
        <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-surface-850/95 backdrop-blur pt-safe">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <button
              type="button"
              aria-label="Menyuni ochish"
              onClick={() => setDrawerOpen(true)}
              className="grid size-10 place-items-center rounded-xl text-slate-300 hover:bg-slate-800 lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
              {NAV.find((n) => n.to === location.pathname)?.label ?? 'Boshqaruv paneli'}
            </h1>

            {pendingCount > 0 ? (
              <Badge tone="amber">{pendingCount} kutilayotgan chek</Badge>
            ) : null}
            {!online ? (
              <Badge tone="rose">
                <WifiOff className="size-3.5" /> Oflayn
              </Badge>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 sm:flex lg:hidden"
            >
              <LogOut className="size-4" /> Chiqish
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
