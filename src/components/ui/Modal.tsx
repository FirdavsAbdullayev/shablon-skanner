import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { IconButton } from './Button';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Mobil uchun pastdan chiqadigan oyna (bottom sheet) */
  sheet?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  bodyClassName?: string;
};

const SIZES = {
  sm: 'max-w-[20rem] sm:max-w-[22rem]',
  md: 'max-w-[24rem] sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  sheet = false,
  size = 'md',
  closeOnBackdrop = true,
  bodyClassName = '',
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={[
        'animate-backdrop fixed inset-0 z-50 flex bg-slate-950/70 backdrop-blur-sm',
        sheet ? 'items-end sm:items-center sm:justify-center' : 'items-center justify-center p-3',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          'flex w-full flex-col overflow-hidden border border-slate-700/70 bg-surface-850 shadow-2xl shadow-black/50',
          sheet
            ? 'max-h-[92dvh] animate-sheet rounded-t-3xl sm:rounded-3xl'
            : 'max-h-[90dvh] animate-in rounded-2xl',
          SIZES[size],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Yuqori aksent chizig'i */}
        <div
          aria-hidden
          className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600"
        />

        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 px-4 py-3">
            <div className="min-w-0">
              {sheet ? (
                <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-600 sm:hidden" />
              ) : null}
              {title ? <h2 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-sm text-slate-400">{description}</p> : null}
            </div>
            <IconButton label="Yopish" onClick={onClose} size="sm">
              <X className="size-5" />
            </IconButton>
          </div>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 sm:px-4 sm:py-4 ${bodyClassName}`}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-slate-700/60 bg-surface-850 px-3.5 py-2.5 pb-safe sm:px-4 sm:py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
