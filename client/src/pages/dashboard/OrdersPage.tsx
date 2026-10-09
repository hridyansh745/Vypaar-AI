import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight, Plus, ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import { DashCard, EmptyState, KpiCard } from '../../components/dashboard/DashCard';
import { useToast } from '../../context/ToastContext';
import {
  DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SUPPLIERS, STORE_KEYS, formatINR, loadStore, saveStore,
  orderTotal, type DemoOrder, type DemoOrderItem, type OrderStatus,
} from '../../lib/demoData';
import { formatDate } from '../../lib/utils';

const FLOW: OrderStatus[] = ['draft', 'pending', 'confirmed', 'processing', 'dispatched', 'delivered'];

const statusCls: Record<OrderStatus, string> = {
  draft: 'border-line bg-charcoal text-muted',
  pending: 'border-brand/30 bg-brand/10 text-brand',
  confirmed: 'border-info/30 bg-info/10 text-info',
  processing: 'border-info/30 bg-info/10 text-info',
  dispatched: 'border-success/30 bg-success/10 text-success',
  delivered: 'border-success/30 bg-success/10 text-success',
  cancelled: 'border-danger/30 bg-danger/10 text-danger',
};

export function OrdersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [extra, setExtra] = useState<DemoOrder[]>(() => loadStore<DemoOrder[]>(STORE_KEYS.orders, []));
  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<DemoOrderItem[]>([]);
  const [pickProduct, setPickProduct] = useState('');
  const [pickQty, setPickQty] = useState('10');
  const [notes, setNotes] = useState('');

  const all = useMemo(() => [...extra, ...DEMO_ORDERS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [extra]);
  const supplier = DEMO_SUPPLIERS.find((s) => s.id === supplierId);
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const supplierName = (id: string) => DEMO_SUPPLIERS.find((s) => s.id === id)?.name ?? id;

  const addItem = () => {
    const p = DEMO_PRODUCTS.find((x) => x.id === pickProduct);
    const q = Math.max(1, Math.floor(Number(pickQty) || 1));
    if (!p || !supplier) {
      toast.error(t('dash2.orders.required'));
      return;
    }
    setItems((list) => {
      const existing = list.find((i) => i.productId === p.id);
      if (existing) {
        return list.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + q } : i));
      }
      return [...list, { productId: p.id, name: p.name, qty: q, unitPrice: p.cost }];
    });
    setPickProduct('');
    setPickQty('10');
  };

  const createOrder = () => {
    if (!supplier || items.length === 0) {
      toast.error(t('dash2.orders.required'));
      return;
    }
    const order: DemoOrder = {
      id: `upo-${Date.now()}`,
      no: `PO-${1200 + extra.length}`,
      supplierId,
      items,
      address: '12/3 Hazratganj Main Road, Lucknow 226001',
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const next = [order, ...extra];
    setExtra(next);
    saveStore(STORE_KEYS.orders, next);
    setCreating(false);
    setItems([]);
    setNotes('');
    toast.success(t('dash2.orders.created', { no: order.no }));
  };

  /** Demo simulation of the order workflow — clearly labelled, nothing is sent to a real supplier. */
  const advance = (o: DemoOrder) => {
    const idx = FLOW.indexOf(o.status);
    const nextStatus = FLOW[Math.min(idx + 1, FLOW.length - 1)];
    const apply = (list: DemoOrder[]) => list.map((x) => (x.id === o.id ? { ...x, status: nextStatus } : x));
    if (extra.some((x) => x.id === o.id)) {
      setExtra(apply(extra));
      saveStore(STORE_KEYS.orders, extra);
    }
    toast.info(t('dash2.orders.simulated', { status: t(`dash2.status_${nextStatus}`) }));
  };

  const cancel = (o: DemoOrder) => {
    if (extra.some((x) => x.id === o.id)) {
      const next = extra.map((x) => (x.id === o.id ? { ...x, status: 'cancelled' as const } : x));
      setExtra(next);
      saveStore(STORE_KEYS.orders, next);
    }
    toast.info(t('dash2.orders.cancelled'));
  };

  const pendingCount = all.filter((o) => o.status === 'pending').length;
  const openValue = all
    .filter((o) => !['delivered', 'cancelled'].includes(o.status))
    .reduce((s, o) => s + orderTotal(o), 0);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.ordersTitle')}</h1>
          <p className="mt-0.5 text-xs text-muted">{t('dash2.ordersSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
        >
          <Plus size={16} aria-hidden="true" /> {t('dash2.orders.create')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard icon={Truck} label={t('dash2.orders.total')} value={String(all.length)} />
        <KpiCard icon={ShoppingCart} label={t('dash2.orders.pending')} value={String(pendingCount)} tone="brand" />
        <KpiCard icon={Check} label={t('dash2.orders.deliveredCount')} value={String(all.filter((o) => o.status === 'delivered').length)} tone="success" />
        <KpiCard icon={ShoppingCart} label={t('dash2.orders.openValue')} value={formatINR(openValue)} tone="info" />
      </div>

      {creating && (
        <DashCard title={t('dash2.orders.create')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.orders.supplier')}</span>
              <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setItems([]); }} className={inputCls}>
                <option value="">{t('dash2.orders.selectSupplier')}</option>
                {DEMO_SUPPLIERS.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.sales.product')}</span>
              <select value={pickProduct} onChange={(e) => setPickProduct(e.target.value)} className={inputCls} disabled={!supplier}>
                <option value="">{t('dash2.orders.selectProduct')}</option>
                {DEMO_PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {formatINR(p.cost)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.sales.qty')}</span>
              <div className="flex gap-2">
                <input type="number" min="1" value={pickQty} onChange={(e) => setPickQty(e.target.value)} className={inputCls} />
                <button type="button" onClick={addItem} className="shrink-0 rounded-xl border border-brand/40 px-3 text-brand transition hover:bg-brand/10" aria-label={t('dash2.orders.addItem')}>
                  <Plus size={15} />
                </button>
              </div>
            </label>
          </div>

          {items.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center justify-between rounded-xl border border-line bg-charcoal/60 px-3 py-2 text-xs">
                  <span className="text-white/85">{i.name} × {i.qty}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-white">{formatINR(i.qty * i.unitPrice)}</span>
                    <button type="button" onClick={() => setItems(items.filter((x) => x.productId !== i.productId))} aria-label={t('common.remove')} className="text-danger hover:opacity-80">
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-2 text-xs font-bold text-white">
                <span>{t('dash2.orders.subtotal')}</span>
                <span className="text-brand">{formatINR(total)}</span>
              </li>
            </ul>
          )}

          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium text-muted">{t('dash2.orders.notes')}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-muted">{t('dash2.orders.demoNote')}</p>
            <button type="button" onClick={createOrder} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-hover">
              <Check size={15} aria-hidden="true" /> {t('dash2.orders.place')}
            </button>
          </div>
        </DashCard>
      )}

      <DashCard title={t('dash2.orders.history')}>
        {all.length === 0 ? (
          <EmptyState icon={Truck} title={t('dash2.orders.empty')} />
        ) : (
          <ul className="space-y-2.5">
            {all.map((o) => (
              <li key={o.id} className="rounded-xl border border-line bg-charcoal/60 p-3.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-mono text-xs text-brand">{o.no}</span>
                  <span className="text-xs text-white/85">{supplierName(o.supplierId)}</span>
                  <span className="text-xs text-muted">{formatDate(o.createdAt)}</span>
                  <span className="text-xs font-semibold text-white">{formatINR(orderTotal(o))}</span>
                  <span className="text-[11px] text-muted">{o.items.length} items</span>
                  {o.expected && <span className="text-[11px] text-muted">ETA {formatDate(o.expected)}</span>}
                  <span className={`ms-auto rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusCls[o.status]}`}>
                    {t(`dash2.status_${o.status}`)}
                  </span>
                </div>
                {o.items.length > 0 && (
                  <p className="mt-1.5 truncate text-[11px] text-muted">
                    {o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                  </p>
                )}
                {!['delivered', 'cancelled'].includes(o.status) && (
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => advance(o)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-white/80 transition hover:border-brand/40 hover:text-brand"
                    >
                      {t('dash2.orders.advance')} <ChevronRight size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => cancel(o)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-danger transition hover:border-danger/40"
                    >
                      <X size={12} /> {t('dash2.orders.cancel')}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted">{t('dash2.orders.listNote')}</p>
      </DashCard>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-line bg-charcoal/80 px-3 py-2 text-sm text-white focus:border-brand/40 focus:outline-none disabled:opacity-50';

export default OrdersPage;
