import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../lib/utils';

const inputBase =
  'w-full rounded-xl border bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/60 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60';

function borderClass(error?: string) {
  return error ? 'border-danger/70' : 'border-line hover:border-line-strong';
}

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-white/90">
        {label}
        {required && <span className="ms-1 text-brand" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  wrapperClassName?: string | undefined;
  /** Rendered as an inline prefix inside the input (e.g. "+91"). */
  prefix?: ReactNode;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, required, className, id, wrapperClassName, prefix, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `fld-${autoId}`;
  const describedBy = [error ? `${inputId}-error` : null, hint && !error ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <FieldShell
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-sm font-medium text-muted"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(inputBase, borderClass(error), prefix && 'ps-14', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  wrapperClassName?: string | undefined;
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, required, className, id, wrapperClassName, placeholder, children, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `sel-${autoId}`;
  const describedBy = [error ? `${inputId}-error` : null, hint && !error ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <FieldShell
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(inputBase, borderClass(error), 'appearance-none bg-no-repeat pe-10', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A3A3A3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.85rem center',
        }}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    </FieldShell>
  );
});

export type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `chk-${autoId}`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3 text-sm text-white/90">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line bg-ink accent-brand"
          {...rest}
        />
        <span className="leading-relaxed">{label}</span>
      </label>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted ps-7">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger ps-7">
          <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  wrapperClassName?: string | undefined;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, required, className, id, wrapperClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `txt-${autoId}`;
  return (
    <FieldShell
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(inputBase, borderClass(error), 'min-h-24 resize-y', className)}
        {...rest}
      />
    </FieldShell>
  );
});
