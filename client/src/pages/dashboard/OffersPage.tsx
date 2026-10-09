import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Percent, Plus, Tag, X } from 'lucide-react';
import { DashCard, EmptyState } from '../../components/dashboard/DashCard';
import { useToast } from '../../context/ToastContext';
import {
  DEMO_OFFERS, STORE_KEYS, loadStore, saveStore,
  type DemoOffer, type OfferKind, type OfferStatus,
} from '../../lib/demoData';

const STATUSES: OfferStatus[] = ['draft', 'scheduled', 'active', 'expired', 'disabled'];

function effectiveStatus(o: DemoOffer): OfferStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (o.status === 'disabled' || o.status === 'draft') return o.status;
  if (o.end && o.end < today) return 'expired';
  if (o.start && o.start > today) return 'scheduled';
  return o.status;
}

const statusCls: Record<OfferStatus, string> = {
  draft: 'border-line bg-charcoal text-muted',
  scheduled: 'border-info/30 bg-info/10 text-info',
  active: 'border-success/30 bg-success/10 text-success',
  expired: 'border-danger/30 bg-danger/10 text-danger',
  disabled: 'border-line bg-charcoal text-muted',
};

export function OffersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [extra, setExtra] = useState<DemoOffer[]>(() => loadStore<DemoOffer[]>(STORE_KEYS.offers, []));
  const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', kind: 'product' as OfferKind, scope: '', discount: 10, start: '', end: '', minQty: 1, conditions: '', source: 'internal' as 'internal' | 'supplier' });

  const all = useMemo(() => [...extra, ...DEMO_OFFERS], [extra]);
  const visible = useMemo(
    () => (filter === 'all' ? all : all.filter((o) => effectiveStatus(o) === filter)),
    [all, filter],
  );

  const create = () => {
    if (!form.name.trim() || !form.scope.trim()) {
      toast.error(t('dash2.offers.required'));
      return;
    }
    if (form.start && form.end && form.end < form.start) {
      toast.error(t('dash2.offers.badDates'));
      return;
    }
    const offer: DemoOffer = {
      ...form,
      id: `uo-${Date.now()}`,
      status: form.start ? 'scheduled' : 'draft',
      maxDiscount: undefined,
    };
    const next = [offer, ...extra];
    setExtra(next);
    saveStore(STORE_KEYS.offers, next);
    setShowForm(false);
    setForm({ ...form, name: '', scope: '', conditions: '' });
    toast.success(t('dash2.offers.created'));
  };

  const toggle = (o: DemoOffer) => {
    if (!extra.some((x) => x.id === o.id)) {
      toast.info(t('dash2.offers.demoOnlyEdit'));
      return;
    }
    const next = extra.map((x) =>
      x.id === o.id ? { ...x, status: x.status === 'active' ? ('disabled' as const) : ('active' as const) } : x,
    );
    setExtra(next);
    saveStore(STORE_KEYS.offers, next);
  };

  const remove = (o: DemoOffer) => {
    const next = extra.filter((x) => x.id !== o.id);
    setExtra(next);
    saveStore(STORE_KEYS.offers, next);
    toast.info(t('dash2.offers.removed'));
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.offersTitle')}</h1>
          <p className="mt-0.5 text-xs text-muted">{t('dash2.offersSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
        >
          <Plus size={16} aria-hidden="true" /> {t('dash2.offers.create')}
        </button>
      </div>

      {showForm && (
        <DashCard title={t('dash2.offers.create')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <L label={t('dash2.offers.name')}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </L>
            <L label={t('dash2.offers.type')}>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as OfferKind })} className={inputCls}>
                {(['product', 'category', 'quantity', 'bulk', 'supplier', 'campaign'] as const).map((k) => (
                  <option key={k} value={k}>{t(`dash2.offers.kind_${k}`)}</option>
                ))}
              </select>
            </L>
            <L label={t('dash2.offers.scope')}>
              <input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className={inputCls} placeholder={t('dash2.offers.scopePh')} />
            </L>
            <L label={t('dash2.offers.discount')}>
              <input type="number" min="1" max="90" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className={inputCls} />
            </L>
            <L label={t('dash2.offers.start')}>
              <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputCls} />
            </L>
            <L label={t('dash2.offers.end')}>
              <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputCls} />
            </L>
            <L label={t('dash2.offers.minQty')}>
              <input type="number" min="1" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) })} className={inputCls} />
            </L>
            <L label={t('dash2.offers.source')}>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as 'internal' | 'supplier' })} className={inputCls}>
                <option value="internal">{t('dash2.offers.srcInternal')}</option>
                <option value="supplier">{t('dash2.offers.srcSupplier')}</option>
              </select>
            </L>
            <L label={t('dash2.offers.conditions')}>
              <input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} className={inputCls} />
            </L>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-muted">{t('dash2.offers.formNote')}</p>
            <button type="button" onClick={create} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-hover">
              <Check size={15} aria-hidden="true" /> {t('common.continue')}
            </button>
          </div>
        </DashCard>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === s ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-white'
            }`}
          >
            {s === 'all' ? t('dash2.offers.all') : t(`dash2.status_${s}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <DashCard>
          <EmptyState icon={Percent} title={t('dash2.offers.empty')} desc={t('dash2.offers.emptyDesc')} />
        </DashCard>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const st = effectiveStatus(o);
            return (
              <article key={o.id} className="relative overflow-hidden rounded-2xl border border-line bg-[#171717] p-5 transition hover:border-line-strong">
                <span className="pointer-events-none absolute -end-6 -top-6 h-20 w-20 rounded-full bg-brand/[0.07]" aria-hidden="true" />
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                    {o.source === 'supplier' ? <Tag size={17} aria-hidden="true" /> : <Percent size={17} aria-hidden="true" />}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCls[st]}`}>
                    {t(`dash2.status_${st}`)}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{o.name}</h3>
                <p className="mt-0.5 truncate text-xs text-muted">{o.scope}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-brand">{o.discount}%</p>
                <div className="mt-2 space-y-1 text-[11px] text-muted">
                  {o.minQty > 1 && <p>{t('dash2.offers.minQtyLabel', { qty: o.minQty })}</p>}
                  {o.conditions && <p>{o.conditions}</p>}
                  {(o.start || o.end) && (
                    <p>{o.start || '—'} → {o.end || t('dash2.offers.noExpiry')}</p>
                  )}
                </div>
                <div className="mt-3 border-t border-line/60 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted/80">
                  {o.source === 'supplier' ? t('dash2.offers.srcSupplier') : t('dash2.offers.srcInternal')}
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(o)}
                    disabled={st === 'expired'}
                    className="flex-1 rounded-lg border border-line px-2 py-1.5 text-[11px] text-white/80 transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
                  >
                    {st === 'active' ? t('dash2.offers.deactivate') : t('dash2.offers.activate')}
                  </button>
                  {extra.some((x) => x.id === o.id) && (
                    <button type="button" onClick={() => remove(o)} aria-label={t('common.remove')} className="rounded-lg border border-line px-2 py-1.5 text-[11px] text-danger transition hover:border-danger/40">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted">{t('dash2.offers.demoNote')}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none';

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export default OffersPage;
