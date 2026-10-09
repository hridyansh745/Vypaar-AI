import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowRight, Banknote, BarChart3, Bot, Calendar, ChevronRight,
  IndianRupee, Lightbulb, Package, PackageX, Plus, Receipt, ShoppingCart, Sparkles, Truck, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useServerConfig } from '../lib/serverConfig';
import { useToast } from '../context/ToastContext';
import { AiPanel } from '../components/dashboard/AiPanel';
import { DashCard, EmptyState, KpiCard, StatusBadge } from '../components/dashboard/DashCard';
import {
  aggregateSeries, computeKpis, DEMO_DAYS, DEMO_PRODUCTS, DEMO_TRANSACTIONS,
  LOW_STOCK_PRODUCTS, OUT_OF_STOCK_PRODUCTS, revenueByCategory, topProducts,
  formatINR, formatINRCompact, type Granularity, type RangeKey,
} from '../lib/demoData';
import { formatDate } from '../lib/utils';

const chartTooltipStyle = {
  backgroundColor: '#1b1b1b',
  border: '1px solid #262626',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { config } = useServerConfig();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const range = (params.get('range') as RangeKey) || 'month';
  const granularity = (params.get('view') as Granularity) || 'daily';
  const welcome = params.get('welcome') === '1';

  const setRange = (r: RangeKey) => {
    const next = new URLSearchParams(params);
    next.set('range', r);
    if (r === 'custom' && !params.get('from')) {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      next.set('from', d.toISOString().slice(0, 10));
      next.set('to', new Date().toISOString().slice(0, 10));
    }
    setParams(next, { replace: true });
  };

  const custom = { from: params.get('from') || '', to: params.get('to') || '' };
  const kpis = useMemo(() => computeKpis(range, custom), [range, custom.from, custom.to]);
  const days = useMemo(() => {
    if (range === 'custom' && custom.from && custom.to) {
      return DEMO_DAYS.filter((d) => d.date >= custom.from && d.date <= custom.to);
    }
    const count = range === 'today' ? 1 : range === 'week' ? 7 : 30;
    return DEMO_DAYS.slice(-count);
  }, [range, custom.from, custom.to]);
  const series = useMemo(() => aggregateSeries(days, granularity), [days, granularity]);
  const categories = useMemo(() => revenueByCategory(), []);
  const best = useMemo(() => topProducts(5), []);
  const transactions = DEMO_TRANSACTIONS.slice(0, 6);

  const insights = [
    kpis.prev
      ? {
          icon: BarChart3,
          text: t('dash2.insight.trend', { pct: Math.round(((kpis.sales - kpis.prev.sales) / kpis.prev.sales) * 100) }),
          tone: 'info' as const,
        }
      : null,
    best[0]
      ? { icon: Sparkles, text: t('dash2.insight.top', { name: best[0].name, amount: formatINR(best[0].price * best[0].unitsSold) }), tone: 'brand' as const }
      : null,
    OUT_OF_STOCK_PRODUCTS.length > 0
      ? { icon: PackageX, text: t('dash2.insight.outOfStock', { count: OUT_OF_STOCK_PRODUCTS.length }), tone: 'danger' as const }
      : null,
    { icon: Wallet, text: t('dash2.insight.outstanding', { amount: formatINR(kpis.outstanding) }), tone: 'warn' as const },
  ].filter(Boolean) as { icon: typeof BarChart3; text: string; tone: 'info' | 'brand' | 'danger' | 'warn' }[];

  const quickActions = [
    { icon: Receipt, label: t('dash2.qa.invoice'), to: '/dashboard/sales' },
    { icon: ShoppingCart, label: t('dash2.qa.sale'), to: '/dashboard/sales' },
    { icon: IndianRupee, label: t('dash2.qa.expense'), to: '/dashboard/sales' },
    { icon: Plus, label: t('dash2.qa.product'), to: '/dashboard/sales' },
    { icon: BarChart3, label: t('dash2.qa.reports'), to: '/dashboard/sales' },
    { icon: Bot, label: t('dash2.qa.askAi'), to: '/dashboard/assistant' },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      {welcome && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand/[0.07] px-4 py-3.5" role="status">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-sm text-white/90">
            <span className="font-semibold text-brand">{t('dash2.welcomeTitle')}</span>{' '}
            {t('dash2.welcomeSub')}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('welcome');
              setParams(next, { replace: true });
              toast.info(t('dash2.demoNote'));
            }}
            aria-label={t('common.close')}
            className="ms-auto text-muted transition hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Header row: title + date range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.overviewTitle')}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {user?.demo ? t('dash2.demoSubtitle') : t('dash.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line bg-charcoal/70 p-1" role="tablist" aria-label={t('dash2.range')}>
            {(['today', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cnTab(range === r)}
              >
                {t(`dash2.range_${r}`)}
              </button>
            ))}
            <button type="button" role="tab" aria-selected={range === 'custom'} onClick={() => setRange('custom')} className={cnTab(range === 'custom')}>
              {t('dash2.range_custom')}
            </button>
          </div>
          {range === 'custom' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs text-brand">
              <Calendar size={13} aria-hidden="true" />
              {custom.from || '…'} → {custom.to || '…'}
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Banknote} label={t('dash2.kpi.sales')} value={formatINRCompact(kpis.sales)} trend={{ current: kpis.sales, prev: kpis.prev?.sales }} />
        <KpiCard icon={Wallet} label={t('dash2.kpi.profit')} value={formatINRCompact(kpis.profit)} tone="success" trend={{ current: kpis.profit, prev: kpis.prev?.profit }} />
        <KpiCard icon={Receipt} label={t('dash2.kpi.expenses')} value={formatINRCompact(kpis.expenses)} tone="danger" trend={{ current: kpis.expenses, prev: kpis.prev?.expenses }} />
        <KpiCard icon={ShoppingCart} label={t('dash2.kpi.orders')} value={String(kpis.orders)} tone="info" trend={{ current: kpis.orders, prev: kpis.prev?.orders }} />
        <KpiCard icon={PackageX} label={t('dash2.kpi.lowStock')} value={String(kpis.lowStock)} tone="danger" />
        <KpiCard icon={AlertTriangle} label={t('dash2.kpi.outstanding')} value={formatINRCompact(kpis.outstanding)} tone="brand" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashCard
          className="xl:col-span-2"
          title={t('dash2.chart.salesProfit')}
          action={
            <div className="flex rounded-lg border border-line bg-charcoal/70 p-0.5" role="tablist">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={granularity === g}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('view', g);
                    setParams(next, { replace: true });
                  }}
                  className={cnTab(granularity === g, 'px-2.5 py-1 text-[11px]')}
                >
                  {t(`dash2.view_${g}`)}
                </button>
              ))}
            </div>
          }
        >
          {series.length === 0 ? (
            <EmptyState icon={BarChart3} title={t('dash2.chart.empty')} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={series} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#262626' }} minTickGap={24} />
                <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatINRCompact(v).replace('₹', '₹')} width={64} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatINR(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#a3a3a3' }} />
                <Line type="monotone" dataKey="sales" name={t('dash2.legend.sales')} stroke="#FFD43B" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="profit" name={t('dash2.legend.profit')} stroke="#4ade80" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashCard>

        <DashCard title={t('dash2.chart.revenueBreakdown')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatINRCompact(v).replace('₹', '')} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} width={82} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatINR(Number(value))} />
              <Bar dataKey="value" name={t('dash2.legend.revenue')} fill="#FFD43B" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>
      </div>

      {/* Sales vs expenses + insights */}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashCard className="xl:col-span-2" title={t('dash2.chart.salesVsExpenses')}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD43B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FFD43B" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#262626' }} minTickGap={24} />
              <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatINRCompact(v).replace('₹', '')} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatINR(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#a3a3a3' }} />
              <Area type="monotone" dataKey="sales" name={t('dash2.legend.sales')} stroke="#FFD43B" fill="url(#salesGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name={t('dash2.legend.expenses')} stroke="#f87171" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </DashCard>

        <DashCard title={t('dash2.insights')} action={<Lightbulb size={15} className="text-brand" aria-hidden="true" />}>
          <ul className="space-y-2.5">
            {insights.map(({ icon: Icon, text, tone }, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-charcoal/60 px-3 py-2.5">
                <Icon size={15} className={cnTone(tone)} aria-hidden="true" />
                <span className="text-xs leading-relaxed text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </DashCard>
      </div>

      {/* Transactions + inventory */}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashCard
          className="xl:col-span-2"
          title={t('dash2.recentTxns')}
          action={
            <Link to="/dashboard/sales" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              {t('dash2.viewAll')} <ArrowRight size={13} aria-hidden="true" />
            </Link>
          }
        >
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[560px] text-start text-sm">
              <thead>
                <tr className="border-b border-line text-start text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.th.invoice')}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.th.customer')}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.th.date')}</th>
                  <th className="py-2 pe-3 text-end font-medium">{t('dash2.th.amount')}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.th.status')}</th>
                  <th className="py-2 text-start font-medium">{t('dash2.th.method')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-line/50 transition last:border-0 hover:bg-white/[0.03]">
                    <td className="py-2.5 pe-3 font-mono text-xs text-brand">{tx.invoice}</td>
                    <td className="py-2.5 pe-3 text-white/85">{tx.customer}</td>
                    <td className="py-2.5 pe-3 text-xs text-muted">{formatDate(tx.date)}</td>
                    <td className="py-2.5 pe-3 text-end font-semibold text-white">{formatINR(tx.amount)}</td>
                    <td className="py-2.5 pe-3"><StatusBadge status={tx.status} label={t(`dash2.status_${tx.status}`)} /></td>
                    <td className="py-2.5 text-xs uppercase text-muted">{tx.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashCard>

        <DashCard
          title={t('dash2.inventoryAlerts')}
          action={
            <Link to="/dashboard/sales" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              {t('dash2.manageInventory')} <ChevronRight size={13} aria-hidden="true" />
            </Link>
          }
        >
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line bg-charcoal/60 py-2.5">
              <p className="text-lg font-bold text-white">{DEMO_PRODUCTS.length}</p>
              <p className="text-[10px] text-muted">{t('dash2.invTotal')}</p>
            </div>
            <div className="rounded-xl border border-brand/25 bg-brand/[0.06] py-2.5">
              <p className="text-lg font-bold text-brand">{LOW_STOCK_PRODUCTS.length}</p>
              <p className="text-[10px] text-muted">{t('dash2.invLow')}</p>
            </div>
            <div className="rounded-xl border border-danger/25 bg-danger/[0.06] py-2.5">
              <p className="text-lg font-bold text-danger">{OUT_OF_STOCK_PRODUCTS.length}</p>
              <p className="text-[10px] text-muted">{t('dash2.invOut')}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {[...OUT_OF_STOCK_PRODUCTS, ...LOW_STOCK_PRODUCTS].slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-charcoal/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/90">{p.name}</p>
                  <p className="text-[10px] text-muted">{t('dash2.reorderAt', { level: p.reorderLevel })}</p>
                </div>
                <StatusBadge status={p.stock === 0 ? 'overdue' : 'pending'} label={p.stock === 0 ? t('dash2.status_out') : t('dash2.status_low')} />
              </li>
            ))}
          </ul>
        </DashCard>
      </div>

      {/* Top products + quick actions + AI */}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashCard title={t('dash2.topProducts')}>
          <ol className="space-y-2.5">
            {best.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-xs font-bold text-brand">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/90">{p.name}</p>
                  <p className="text-[10px] text-muted">{t('dash2.unitsSold', { count: p.unitsSold })}</p>
                </div>
                <span className="text-xs font-semibold text-white">{formatINR(p.price * p.unitsSold)}</span>
              </li>
            ))}
          </ol>
        </DashCard>

        <DashCard title={t('dash2.quickActions')}>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ icon: Icon, label, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  navigate(to);
                  toast.info(t('dash2.demoNote'));
                }}
                className="flex flex-col items-start gap-2 rounded-xl border border-line bg-charcoal/60 px-3 py-3 text-start transition hover:border-brand/40 hover:bg-brand/[0.06]"
              >
                <Icon size={17} className="text-brand" aria-hidden="true" />
                <span className="text-xs font-medium text-white/85">{label}</span>
              </button>
            ))}
          </div>
        </DashCard>

        <div className="min-h-[380px]">
          <AiPanel compact aiConfigured={config.ai.configured} aiProvider={config.ai.provider} />
        </div>
      </div>

      {/* Demand strip */}
      <DashCard
        title={t('dash2.demandTrend')}
        action={
          <Link to="/dashboard/sales" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            {t('dash2.salesDemand')} <Truck size={13} aria-hidden="true" />
          </Link>
        }
      >
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#262626' }} minTickGap={24} />
            <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area type="monotone" dataKey="sales" name={t('dash2.legend.sales')} stroke="#60a5fa" fill="url(#demandGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </DashCard>

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Package size={12} aria-hidden="true" />
        {t('dash2.datasetNote')}
      </p>
    </div>
  );
}

function cnTab(active: boolean, extra = ''): string {
  return [
    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
    extra,
    active ? 'bg-brand text-ink' : 'text-muted hover:text-white',
  ].join(' ');
}

function cnTone(tone: 'info' | 'brand' | 'danger' | 'warn'): string {
  return {
    info: 'text-info',
    brand: 'text-brand',
    danger: 'text-danger',
    warn: 'text-brand',
  }[tone];
}

export default DashboardPage;
