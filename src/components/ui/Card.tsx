import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-700/60 bg-surface-850/80 shadow-md shadow-black/10',
        padded ? 'p-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
  icon,
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {children}
      </h3>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  tone?: 'brand' | 'blue' | 'amber' | 'violet' | 'rose';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500/12 text-brand-400 ring-brand-500/25',
    blue: 'bg-sky-500/12 text-sky-400 ring-sky-500/25',
    amber: 'bg-amber-500/12 text-amber-400 ring-amber-500/25',
    violet: 'bg-violet-500/12 text-violet-400 ring-violet-500/25',
    rose: 'bg-rose-500/12 text-rose-400 ring-rose-500/25',
  };

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={[
        'flex items-start gap-3 rounded-2xl border border-slate-700/60 bg-surface-850/80 p-4 text-left',
        onClick ? 'transition-colors hover:border-slate-600 hover:bg-surface-800' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${tones[tone]}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-lg font-bold tabular-nums text-white sm:text-xl">{value}</span>
        {sub ? <span className="mt-0.5 block truncate text-xs text-slate-400">{sub}</span> : null}
      </span>
    </Comp>
  );
}

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: 'slate' | 'brand' | 'amber' | 'rose' | 'sky' | 'violet';
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-700/60 text-slate-200',
    brand: 'bg-brand-500/15 text-brand-300',
    amber: 'bg-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/15 text-rose-300',
    sky: 'bg-sky-500/15 text-sky-300',
    violet: 'bg-violet-500/15 text-violet-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
      <Loader2 className="size-7 animate-spin text-brand-400" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon ? (
        <span className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
          {icon}
        </span>
      ) : null}
      <p className="text-base font-semibold text-slate-200">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-500' : 'bg-slate-600',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
