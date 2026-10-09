import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatINR } from '../../lib/demoData';

/* ------------------------------ Card ------------------------------ */

export function DashCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-line bg-[#171717] p-5 transition-colors hover:border-line-strong/60',
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------ KPI card ------------------------------ */

function trendPercent(current: number, prev?: number): number | null {
  if (prev === undefined || prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  tone = 'brand',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  trend?: { current: number; prev?: number; format?: (n: number) => string };
  tone?: 'brand' | 'danger' | 'success' | 'info';
}) {
  const { t } = useTranslation();
  const pct = trend ? trendPercent(trend.current, trend.prev) : null;
  const up = pct !== null && pct >= 0;
  const toneCls = {
    brand: 'border-brand/25 bg-brand/10 text-brand',
    danger: 'border-danger/30 bg-danger/10 text-danger',
    success: 'border-success/30 bg-success/10 text-success',
    info: 'border-info/30 bg-info/10 text-info',
  }[tone];

  return (
    <article className="rounded-2xl border border-line bg-[#171717] p-4.5 p-5 transition hover:border-line-strong/60">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', toneCls)}>
          <Icon size={18} aria-hidden="true" />
        </span>
        {pct !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
            )}
          >
            {up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
            {up ? '+' : ''}{pct}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-muted/80">{sub}</p>}
      {trend && !trend.prev && (
        <p className="mt-1 text-[11px] text-muted/70">{t('dash2.noComparison')}</p>
      )}
    </article>
  );
}

/* ------------------------------ status badge ------------------------------ */

export function StatusBadge({ status, label }: { status: 'paid' | 'pending' | 'overdue' | string; label: string }) {
  const cls =
    status === 'paid'
      ? 'border-success/30 bg-success/10 text-success'
      : status === 'pending'
        ? 'border-brand/30 bg-brand/10 text-brand'
        : 'border-danger/30 bg-danger/10 text-danger';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      {label}
    </span>
  );
}

/* ------------------------------ empty state ------------------------------ */

export function EmptyState({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 py-10 text-center">
      <Icon size={26} className="text-muted/60" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-white/80">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{desc}</p>}
    </div>
  );
}

export { formatINR };
