import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Spinner } from '../ui';

/** FAQAT ADMIN uchun sahifalar darvozasi */
export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/kirish" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/kassa" replace />;
  return <Outlet />;
}

/** Tizimga kirgan har qanday foydalanuvchi uchun */
export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/kirish" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Ilova ochilganda tokenni tekshirib bo'lguncha kutish ekrani */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="grid h-screen-safe place-items-center bg-surface-900">
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-14 animate-in place-items-center rounded-2xl bg-brand-500 text-slate-950">
          <ReceiptText className="size-7" />
        </div>
          <p className="text-lg font-bold text-white">Shablon POS</p>
          <Spinner label="Tekshirilmoqda..." />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
