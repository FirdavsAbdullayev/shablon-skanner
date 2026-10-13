import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, leftIcon, rightSlot, className = '', containerClassName = '', ...rest },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        ) : null}

        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'w-full rounded-xl border bg-slate-900/70 text-slate-100 placeholder:text-slate-500',
            'h-12 px-3.5 text-base transition-colors',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30'
              : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/25',
            leftIcon ? 'pl-10' : '',
            rightSlot ? 'pr-12' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />

        {rightSlot ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

type SelectProps = InputHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  options: { value: string; label: string }[];
  containerClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className = '', containerClassName = '', ...rest },
  ref,
) {
  const id = useId();
  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        ref={ref}
        className={[
          'h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-base text-slate-100',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1.5 text-sm text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
