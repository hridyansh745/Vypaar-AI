import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast, type ToastType } from '../context/ToastContext';
import { cn } from '../lib/utils';

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const accents: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-brand',
  info: 'text-info',
};

export function ToastNotification() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed end-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className="animate-slide-in pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-raised/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur"
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', accents[toast.type])} aria-hidden="true" />
            <p className="flex-1 text-sm leading-relaxed text-white/90">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-muted transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastNotification;
