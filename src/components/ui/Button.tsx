import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-slate-950 hover:bg-brand-400 active:bg-brand-600 shadow-lg shadow-brand-500/20 font-semibold',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 font-semibold',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800 font-medium',
  outline: 'border border-slate-600 text-slate-200 hover:bg-slate-800 active:bg-slate-700 font-medium',
  ghost: 'text-slate-300 hover:bg-slate-800 active:bg-slate-700 font-medium',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 font-semibold',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  xl: 'h-14 px-6 text-lg gap-2.5 rounded-2xl',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconRight,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150 active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        'disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 shrink-0 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  label: string;
};

const ICON_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'size-9 rounded-lg',
  md: 'size-11 rounded-xl',
  lg: 'size-14 rounded-2xl',
};

export function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  className = '',
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex shrink-0 items-center justify-center transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        ICON_SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
