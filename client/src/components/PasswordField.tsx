import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, CircleAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, error, hint, required, className, id, ...rest },
  ref,
) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? `pwd-${autoId}`;
  const describedBy = [error ? `${inputId}-error` : null, hint && !error ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-white/90">
        {label}
        {required && <span className="ms-1 text-brand" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'w-full rounded-xl border bg-ink px-4 py-3 pe-12 text-sm text-white placeholder:text-muted/60 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20',
            error ? 'border-danger/70' : 'border-line hover:border-line-strong',
            className,
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
