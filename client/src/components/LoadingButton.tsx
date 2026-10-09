import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-ink font-semibold hover:bg-brand-hover active:scale-[0.99] shadow-[0_10px_30px_-12px_rgba(255,212,59,0.55)]',
  secondary:
    'bg-white/5 text-white border border-line hover:bg-white/10 hover:border-line-strong active:scale-[0.99]',
  ghost: 'bg-transparent text-muted hover:text-white hover:bg-white/5',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};

export type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: Variant;
  children: ReactNode;
  block?: boolean;
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(function LoadingButton(
  { loading = false, variant = 'primary', className, children, disabled, block = true, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:scale-100',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
