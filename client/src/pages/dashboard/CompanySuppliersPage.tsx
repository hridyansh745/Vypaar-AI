import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, Phone, Plus, Search, X } from 'lucide-react';
import { DashCard, EmptyState } from '../../components/dashboard/DashCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  DEMO_SUPPLIERS, STORE_KEYS, formatINR, loadStore, saveStore,
  supplierOrders, supplierPurchases, orderTotal, type DemoSupplier,
} from '../../lib/demoData';

type Supplier = DemoSupplier;

const emptyForm: Omit<Supplier, 'id' | 'totalPurchased' | 'onTimeRate'> = {
  name: '', company: '', contactPerson: '', phone: '', email: '', category: 'grocery',
  products: '', terms: 'Net 15', outstanding: 0, active: true, notes: '',
};

export function CompanySuppliersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  const [extra, setExtra] = useState<Supplier[]>(() => loadStore<Supplier[]>(STORE_KEYS.suppliers, []));
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Supplier | null>(null);

  const all = useMemo(() => [...extra, ...DEMO_SUPPLIERS], [extra]);
  const filtered = useMemo(
    () =>
      all.filter((s) =>
        `${s.name} ${s.company} ${s.products} ${s.category}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [all, query],
  );

  const persist = (list: Supplier[]) => {
    setExtra(list);
    saveStore(STORE_KEYS.suppliers, list);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    const { id, totalPurchased, onTimeRate, ...rest } = s;
    void id; void totalPurchased; void onTimeRate;
    setForm(rest);
    setEditingId(s.id);
    setShowForm(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t('dash2.sup.required'));
      return;
    }
    if (editingId) {
      persist(extra.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
      toast.success(t('dash2.sup.updated'));
    } else {
      const created: Supplier = {
        ...form,
        id: `us-${Date.now()}`,
        totalPurchased: 0,
        onTimeRate: 0,
      };
      persist([created, ...extra]);
      toast.success(t('dash2.sup.added'));
    }
    setShowForm(false);
  };

  const remove = (s: Supplier) => {
    persist(extra.filter((x) => x.id !== s.id));
    toast.info(t('dash2.sup.removed'));
    if (selected?.id === s.id) setSelected(null);
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.companyTitle')}</h1>
          <p className="mt-0.5 text-xs text-muted">{t('dash2.companySubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
        >
          <Plus size={16} aria-hidden="true" /> {t('dash2.sup.add')}
        </button>
      </div>

      {/* Company profile */}
      <DashCard title={t('dash2.profileTitle')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('dash2.f.business')} value={user?.businessName || user?.name || '—'} />
          <Field label={t('dash2.f.userId')} value={user?.userId || '—'} />
          <Field label={t('dash2.f.status')} value={user?.demo ? t('common.demoMode') : t('dash.accountActive')} />
          <Field label={t('dash2.f.suppliers')} value={String(all.length)} />
        </div>
        <p className="mt-3 text-[11px] text-muted">{t('dash2.profileNote')}</p>
      </DashCard>

      {/* Supplier directory */}
      <DashCard
        title={t('dash2.sup.directory')}
        action={
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dash2.searchPh')}
              className="w-44 rounded-lg border border-line bg-charcoal/80 py-1.5 pe-3 ps-8 text-xs text-white placeholder:text-muted/70 focus:border-brand/40 focus:outline-none sm:w-56"
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState icon={Building2} title={t('dash2.sup.empty')} desc={t('dash2.sup.emptyDesc')} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-charcoal/60 p-4 transition hover:border-line-strong">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setSelected(s)} className="min-w-0 text-start">
                    <p className="truncate text-sm font-semibold text-white hover:text-brand">{s.name}</p>
                    <p className="truncate text-[11px] text-muted">{s.company}</p>
                  </button>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.active ? 'bg-success' : 'bg-muted/40'}`} aria-hidden="true" />
                </div>
                <p className="mt-2 truncate text-[11px] text-muted">{s.contactPerson} · {s.phone}</p>
                <p className="truncate text-[11px] text-muted">{s.products}</p>
                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                  <span className="text-[11px] text-muted">{s.terms}</span>
                  <span className={`text-xs font-semibold ${s.outstanding > 0 ? 'text-brand' : 'text-success'}`}>
                    {formatINR(s.outstanding)}
                  </span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button type="button" onClick={() => openEdit(s)} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-[11px] text-white/80 transition hover:border-brand/40 hover:text-brand">
                    {t('common.edit')}
                  </button>
                  {extra.some((x) => x.id === s.id) && (
                    <button type="button" onClick={() => remove(s)} className="rounded-lg border border-line px-2 py-1.5 text-[11px] text-danger transition hover:border-danger/40" aria-label={t('common.remove')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted">{t('dash2.sup.demoNote')}</p>
      </DashCard>

      {/* Supplier details */}
      {selected && (
        <DashCard
          title={t('dash2.sup.details', { name: selected.name })}
          action={
            <button type="button" onClick={() => setSelected(null)} aria-label={t('common.close')} className="text-muted hover:text-white">
              <X size={16} />
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t('dash2.f.phone')} value={selected.phone} icon />
            <Field label={t('dash2.f.terms')} value={selected.terms} />
            <Field label={t('dash2.f.totalPurchased')} value={formatINR(selected.totalPurchased + supplierPurchases(selected.id))} />
            <Field label={t('dash2.f.onTime')} value={`${selected.onTimeRate}%`} />
          </div>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{t('dash2.sup.orders')}</h3>
          {supplierOrders(selected.id).length === 0 ? (
            <EmptyState icon={Phone} title={t('dash2.sup.noOrders')} />
          ) : (
            <ul className="space-y-2">
              {supplierOrders(selected.id).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-charcoal/60 px-3 py-2.5">
                  <span className="font-mono text-xs text-brand">{o.no}</span>
                  <span className="text-xs text-muted">{o.items.length} items</span>
                  <span className="text-xs font-semibold text-white">{formatINR(orderTotal(o))}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase text-muted">{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div className="animate-slide-in relative w-full max-w-lg rounded-2xl border border-line bg-raised p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {editingId ? t('dash2.sup.edit') : t('dash2.sup.add')}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label={t('common.close')} className="text-muted hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid max-h-[60vh] gap-3 overflow-y-auto pe-1 sm:grid-cols-2">
              <Input label={t('dash2.sup.name')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label={t('dash2.sup.company')} value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
              <Input label={t('dash2.sup.contact')} value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
              <Input label={t('dash2.f.phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Input label={t('dash2.sup.email')} value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Input label={t('dash2.sup.category')} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <Input label={t('dash2.sup.products')} value={form.products} onChange={(v) => setForm({ ...form, products: v })} />
              <Input label={t('dash2.f.terms')} value={form.terms} onChange={(v) => setForm({ ...form, terms: v })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm text-white/80 hover:bg-white/5">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-hover">
                <Check size={15} aria-hidden="true" /> {t('common.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-charcoal/60 px-3.5 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-white">
        {icon && <Phone size={12} className="text-brand" aria-hidden="true" />}
        {value}
      </p>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none"
      />
    </label>
  );
}

export default CompanySuppliersPage;
