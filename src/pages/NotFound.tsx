import { Home, ReceiptText, ScanBarcode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { useAuthStore } from '../store/auth.store';

export function NotFound() {
  const user = useAuthStore((s) => s.user);
  const home = !user ? '/kirish' : user.role === 'ADMIN' ? '/admin' : '/kassa';

  return (
    <div className="grid min-h-screen-safe place-items-center bg-surface-900 px-4">
      <div className="text-center">
        <div className="grid size-20 animate-in place-items-center rounded-3xl bg-brand-500/10 text-brand-400">
        <ReceiptText className="size-10" />
      </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Sahifa topilmadi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Siz izlagan manzil mavjud emas yoki o&rsquo;chirilgan.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to={home}>
            <Button fullWidth icon={<Home className="size-5" />}>
              Asosiy sahifa
            </Button>
          </Link>
          <Link to="/kassa">
            <Button variant="outline" fullWidth icon={<ScanBarcode className="size-5" />}>
              Kassaga o&rsquo;tish
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
