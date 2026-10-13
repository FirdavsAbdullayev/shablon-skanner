import { Eye, EyeOff, KeyRound, LogIn, ReceiptText, User as UserIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { unlockAudio } from '../lib/beep';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';
import { Button, Input } from '../components/ui';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Foydalanuvchi nomi va parolni kiriting');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await login(username, password);
      // Ovoz va tebranish brauzerda birinchi teginishdan keyin ishlaydi
      unlockAudio();
      toast.success(`Xush kelibsiz, ${user.name}!`);
      navigate(user.role === 'ADMIN' ? '/admin' : '/kassa', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen-safe flex-col items-center justify-center overflow-hidden bg-surface-900 px-4 py-8">
      {/* Dekorativ fon dog'lari – professional ko'rinish */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-500/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-16 animate-in place-items-center rounded-2xl bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/25">
            <ReceiptText className="size-8" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-white">Shablon POS</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kassa va ombor boshqaruvi · telefoningiz yetarli
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-700/60 border-t-2 border-t-brand-500 bg-surface-850/95 p-5 shadow-2xl shadow-black/40"
        >
          <Input
            label="Foydalanuvchi nomi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            leftIcon={<UserIcon className="size-4.5" />}
          />

          <Input
            label="Parol"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            leftIcon={<KeyRound className="size-4.5" />}
            rightSlot={
              <button
                type="button"
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\u2019rsatish'}
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />

          {error ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={loading} icon={<LogIn className="size-5" />}>
            Kirish
          </Button>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">Demo hisoblar</p>
            <p>
              Administrator: <span className="font-mono text-brand-400">admin / admin123</span>
            </p>
            <p>
              Kassir: <span className="font-mono text-brand-400">aziza / kassir123</span>
            </p>
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Kassir telefonda ishlaydi — kamera shtrix kodni o&rsquo;qiydi.
        </p>
      </div>
    </div>
  );
}
