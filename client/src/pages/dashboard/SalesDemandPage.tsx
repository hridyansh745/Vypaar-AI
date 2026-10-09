import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, PackageSearch, Plus, Search, ShoppingCart, TrendingUp } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { DashCard, EmptyState, KpiCard, StatusBadge } from '../../components/dashboard/DashCard';
import { useToast } from '../../context/ToastContext';
import {
  aggregateSeries, DEMO_DAYS, DEMO_PRODUCTS, DEMO_TRANSACTIONS, demandForecast,
  formatINR, formatINRCompact, STORE_KEYS, loadStore, saveStore, type DemoSaleEntry, type Granularity, type RangeKey,
} from '../../lib/demoData';
import { formatDate } from '../../lib/utils';

const chartTooltipStyle = {
  backgroundColor: '#1b1b1b',
  border: '1px solid #262626',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
};

export function SalesDemandPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [userSales, setUserSales] = useState<DemoSaleEntry[]>(() => loadStore<DemoSaleEntry[]>(STORE_KEYS.sales, []));
  const [recording, setRecording] = useState(false);
  const [product, setProduct] = useState(DEMO_PRODUCTS[0].name);
  const [qty, setQty] = useState('1');
  const [customer, setCustomer] = useState('');

  const range = (params.get('range') as RangeKey) || 'month';
  const granularity = (params.get('view') as Granularity) || 'daily';

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  const days = useMemo(() => {
    if (range === 'custom') return DEMO_DAYS.slice(-14);
    const count = range === 'today' ? 1 : range === 'week' ? 7 : 30;
    return DEMO_DAYS.slice(-count);
  }, [range]);
  const series = useMemo(() => aggregateSeries(days, granularity), [days, granularity]);
  const forecast = useMemo(() => demandForecast(granularity), [granularity]);

  const allSales: DemoSaleEntry[] = useMemo(() => {
    const base: DemoSaleEntry[] = DEMO_TRANSACTIONS.map((tx, i) => {
      const p = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
      return {
        id: tx.id,
        productName: p.name,
        qty: Math.max(1, Math.round(tx.amount / p.price)),
        unitPrice: p.price,
        discount: 0,
        total: tx.amount,
        customer: tx.customer,
        method: tx.method,
        status: tx.status,
        date: tx.date,
      };
    });
    return [...userSales, ...base];
  }, [userSales]);

  const filtered = useMemo(
    () =>      allSales.filter((s) => `${s.id} ${s.customer} ${s.productName}`.toLowerCase().includes(query.toLowerCase())),
    [allSales, query],
  );

  const recordSale = () => {
    const p = DEMO_PRODUCTS.find((x) => x.name === product);
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    if (!p || !customer.trim()) {
      toast.error(t('dash2.sales.required'));
      return;
    }
    const entry: DemoSaleEntry = {
      id: `us-${Date.now()}`,
      productName: p.name,
      qty: q,
      unitPrice: p.price,
      discount: 0,
      total: p.price * q,
      customer: customer.trim(),
      method: 'cash',
      status: 'paid',
      date: new Date().toISOString(),
    };
    const next = [entry, ...userSales];
    setUserSales(next);
    saveStore(STORE_KEYS.sales, next);
    setRecording(false);
    setCustomer('');
    setQty('1');
    toast.success(t('dash2.sales.recorded', { amount: formatINR(entry.total) }));
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.salesTitle')}</h1>
          <p className="mt-0.5 text-xs text-muted">{t('dash2.salesSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setRecording((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
        >
          <Plus size={16} aria-hidden="true" /> {t('dash2.sales.record')}
        </button>
      </div>

      {recording && (
        <DashCard title={t('dash2.sales.record')}>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.sales.product')}</span>
              <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none">
                {DEMO_PRODUCTS.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.sales.qty')}</span>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.sales.customer')}</span>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none" />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={recordSale} className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-hover">
                {t('common.continue')}
              </button>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-muted">{t('dash2.sales.recordNote')}</p>
        </DashCard>
      )}

      {/* Demand trend + forecast */}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashCard
          className="xl:col-span-2"
          title={t('dash2.salesDemand')}
          action={
            <div className="flex rounded-lg border border-line bg-charcoal/70 p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button key={g} type="button" onClick={() => setParam('view', g)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${granularity === g ? 'bg-brand text-ink' : 'text-muted hover:text-white'}`}>
                  {t(`dash2.view_${g}`)}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="sdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD43B" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#FFD43B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#262626' }} minTickGap={24} />
              <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatINRCompact(v).replace('₹', '')} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatINR(Number(value))} />
              <Area type="monotone" dataKey="sales" name={t('dash2.legend.sales')} stroke="#FFD43B" fill="url(#sdGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </DashCard>

        <DashCard title={t('dash2.forecast')}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={[...forecast.history, ...forecast.forecast.map((f) => ({ label: f.label, sales: undefined, profit: undefined, expenses: undefined, forecast: f.value }))]} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#262626' }} minTickGap={24} />
              <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="sales" name={t('dash2.legend.sales')} stroke="#FFD43B" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" name={t('dash2.forecast')} stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[11px] text-muted">{t('dash2.forecastNote')}</p>
        </DashCard>
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard icon={ShoppingCart} label={t('dash2.kpi.sales')} value={formatINRCompact(days.reduce((s, d) => s + d.sales, 0))} />
        <KpiCard icon={TrendingUp} label={t('dash2.kpi.orders')} value={String(days.reduce((s, d) => s + d.orders, 0))} tone="info" />
        <KpiCard icon={BarChart3} label={t('dash2.sales.avgOrder')} value={formatINR(Math.round(days.reduce((s, d) => s + d.sales, 0) / Math.max(1, days.reduce((s, d) => s + d.orders, 0))))} tone="success" />
        <KpiCard icon={PackageSearch} label={t('dash2.sales.entries')} value={String(filtered.length)} />
      </div>

      {/* Sales history */}
      <DashCard
        title={t('dash2.sales.history')}
        action={
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-muted" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('dash2.searchPh')} className="w-40 rounded-lg border border-line bg-charcoal/80 py-1.5 pe-3 ps-8 text-xs text-white placeholder:text-muted/70 focus:border-brand/40 focus:outline-none sm:w-56" />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={t('dash2.sales.empty')} />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.th.date')}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.sales.product')}</th>
                  <th className="py-2 pe-3 text-start font-medium">{t('dash2.sales.customer')}</th>
                  <th className="py-2 pe-3 text-end font-medium">{t('dash2.th.amount')}</th>
                  <th className="py-2 text-start font-medium">{t('dash2.th.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 12).map((s) => (
                  <tr key={s.id} className="border-b border-line/50 transition last:border-0 hover:bg-white/[0.03]">
                    <td className="py-2.5 pe-3 text-xs text-muted">{formatDate(s.date)}</td>
                    <td className="py-2.5 pe-3 text-white/85">{s.productName} <span className="text-muted">×{s.qty}</span></td>
                    <td className="py-2.5 pe-3 text-xs text-white/75">{s.customer}</td>
                    <td className="py-2.5 pe-3 text-end font-semibold text-white">{formatINR(s.total)}</td>
                    <td className="py-2.5"><StatusBadge status={s.status} label={t(`dash2.status_${s.status}`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">{t('dash2.datasetNote')}</p>
      </DashCard>
    </div>
  );
}

export default SalesDemandPage;
