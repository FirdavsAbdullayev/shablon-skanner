import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { AuthGate, RequireAdmin, RequireAuth } from './components/layout/ProtectedRoute';
import { Toaster } from './components/ui';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Cashiers } from './pages/admin/Cashiers';
import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { SalesHistory } from './pages/admin/SalesHistory';
import { Settings } from './pages/admin/Settings';
import { POS } from './pages/cashier/POS';
import { useAuthStore } from './store/auth.store';
import { toast } from './store/toast.store';

/** Token muddati tugasa yoki o'chirilganda foydalanuvchini kirish sahifasiga qaytaradi */
function SessionWatcher() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handler = () => {
      logout();
      toast.warn('Sessiya tugadi. Qaytadan kiring.');
      navigate('/kirish', { replace: true });
    };
    window.addEventListener('pos:unauthorized', handler);
    return () => window.removeEventListener('pos:unauthorized', handler);
  }, [logout, navigate]);

  return null;
}

/** Rolga qarab qayerga yuborishni hal qiladi */
function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/kirish" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/kassa'} replace />;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <SessionWatcher />
      <AuthGate>
        <Routes>
          <Route path="/kirish" element={<Login />} />

          <Route element={<RequireAuth />}>
            {/* Kassir uchun asosiy sahifa - mobilda ishlash uchun mo'ljallangan */}
            <Route path="/kassa" element={<POS />} />

            {/* Faqat administrator uchun */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="mahsulotlar" element={<Products />} />
                <Route path="kassirlar" element={<Cashiers />} />
                <Route path="sotuvlar" element={<SalesHistory />} />
                <Route path="sozlamalar" element={<Settings />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthGate>
      <Toaster />
    </BrowserRouter>
  );
}
