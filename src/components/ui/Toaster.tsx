import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useToastStore, type ToastKind } from '../../store/toast.store';

const STYLES: Record<ToastKind, { ring: string; icon: ReactNode }> = {
  success: { ring: 'border-brand-500/40 bg-brand-900/60', icon: <CheckCircle2 className="size-5 text-brand-400" /> },
  error: { ring: 'border-rose-500/40 bg-rose-950/70', icon: <XCircle className="size-5 text-rose-400" /> },
  warn: { ring: 'border-amber-500/40 bg-amber-950/60', icon: <AlertTriangle className="size-5 text-amber-400" /> },
  info: { ring: 'border-sky-500/40 bg-sky-950/60', icon: <Info className="size-5 text-sky-400" /> },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-4">
      {toasts.map((t) => {
        const style = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-3.5 py-3 shadow-xl shadow-black/30 backdrop-blur ${style.ring}`}
          >
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <div className="min-w-0 flex-1">
              {t.title ? <p className="text-sm font-semibold text-white">{t.title}</p> : null}
              <p className="text-sm text-slate-200">{t.message}</p>
            </div>
            <button
              type="button"
              aria-label="Xabarni yopish"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
