/**
 * Demo Mode dataset for the VyaparAI dashboard.
 *
 * IMPORTANT (honesty rules):
 * - Everything here is clearly-labelled SAMPLE data generated from a fixed
 *   seed, so figures are consistent between reloads (never random-looking
 *   "real" results).
 * - Nothing in this file is ever persisted as real business data.
 * - Small user-created records (suppliers, offers, orders, recorded sales)
 *   are kept separately in localStorage under `vyaparai_demo_*` keys.
 */

import type { TFunction } from 'i18next';

export interface DayPoint {
  date: string; // YYYY-MM-DD (local)
  sales: number;
  expenses: number;
  orders: number;
}

export interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  unitsSold: number;
}

export type TxnStatus = 'paid' | 'pending' | 'overdue';
export type PayMethod = 'upi' | 'cash' | 'card' | 'bank';

export interface DemoTransaction {
  id: string;
  invoice: string;
  customer: string;
  date: string; // ISO
  amount: number;
  status: TxnStatus;
  method: PayMethod;
}

export interface DemoSupplier {
  id: string;
  name: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  products: string;
  terms: string;
  outstanding: number;
  active: boolean;
  onTimeRate: number;
  totalPurchased: number;
  notes?: string;
}

export type OfferStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'disabled';
export type OfferKind = 'product' | 'category' | 'quantity' | 'bulk' | 'supplier' | 'campaign';

export interface DemoOffer {
  id: string;
  name: string;
  kind: OfferKind;
  scope: string;
  discount: number; // percent
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD ('' = no expiry)
  minQty: number;
  maxDiscount?: number;
  conditions: string;
  status: OfferStatus;
  source: 'internal' | 'supplier';
}

export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';

export interface DemoOrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface DemoOrder {
  id: string;
  no: string;
  supplierId: string;
  items: DemoOrderItem[];
  address: string;
  notes: string;
  status: OrderStatus;
  createdAt: string; // ISO
  expected?: string; // YYYY-MM-DD
}

export interface DemoSaleEntry {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
  customer: string;
  method: PayMethod;
  status: TxnStatus;
  date: string; // ISO
}

/* ------------------------------ helpers ------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatINR(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatINRCompact(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  if (Math.abs(value) >= 100000) {
    return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
  }
  return formatINR(value);
}

/* ------------------------------ daily series (90 days, seeded) ------------------------------ */

export const DEMO_DAYS: DayPoint[] = (() => {
  const rand = mulberry32(20261009);
  const days: DayPoint[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 ? 1.22 : dow === 6 ? 1.12 : 1;
    const drift = 1 + (89 - i) * 0.0018; // gentle upward trend
    const sales = Math.round((9600 + rand() * 5200) * weekend * drift);
    const expenses = Math.round(sales * (0.56 + rand() * 0.14));
    const orders = Math.max(4, Math.round(sales / (330 + rand() * 150)));
    days.push({ date: dateKey(d), sales, expenses, orders });
  }
  return days;
})();

/* ------------------------------ products ------------------------------ */

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'p1', name: 'Aashirvaad Atta 10kg', category: 'grocery', price: 485, cost: 418, stock: 24, reorderLevel: 10, unitsSold: 186 },
  { id: 'p2', name: 'Tata Salt 1kg', category: 'grocery', price: 28, cost: 22, stock: 6, reorderLevel: 12, unitsSold: 412 },
  { id: 'p3', name: 'Amul Butter 500g', category: 'grocery', price: 275, cost: 246, stock: 0, reorderLevel: 8, unitsSold: 97 },
  { id: 'p4', name: 'Fortune Sunflower Oil 1L', category: 'grocery', price: 145, cost: 127, stock: 32, reorderLevel: 15, unitsSold: 233 },
  { id: 'p5', name: 'Parle-G 800g', category: 'grocery', price: 85, cost: 71, stock: 45, reorderLevel: 20, unitsSold: 305 },
  { id: 'p6', name: 'Detergent Powder 1kg', category: 'grocery', price: 110, cost: 92, stock: 9, reorderLevel: 15, unitsSold: 168 },
  { id: 'p7', name: 'LED Bulb 9W', category: 'electronics', price: 120, cost: 94, stock: 60, reorderLevel: 25, unitsSold: 142 },
  { id: 'p8', name: 'Extension Board 4-Socket', category: 'electronics', price: 349, cost: 298, stock: 14, reorderLevel: 10, unitsSold: 58 },
  { id: 'p9', name: 'Cotton Kurta (M)', category: 'apparel', price: 599, cost: 432, stock: 18, reorderLevel: 8, unitsSold: 74 },
  { id: 'p10', name: 'Notebook 200pg (Pack of 6)', category: 'other', price: 210, cost: 178, stock: 40, reorderLevel: 15, unitsSold: 121 },
];

export const LOW_STOCK_PRODUCTS = DEMO_PRODUCTS.filter((p) => p.stock > 0 && p.stock <= p.reorderLevel);
export const OUT_OF_STOCK_PRODUCTS = DEMO_PRODUCTS.filter((p) => p.stock === 0);

/* ------------------------------ transactions ------------------------------ */

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { id: 't1', invoice: 'INV-2041', customer: 'Ramesh Kumar', date: iso(-0), amount: 2450, status: 'paid', method: 'upi' },
  { id: 't2', invoice: 'INV-2040', customer: 'Sunita Devi', date: iso(-0), amount: 860, status: 'pending', method: 'cash' },
  { id: 't3', invoice: 'INV-2039', customer: 'Anil Kirana Store', date: iso(-1), amount: 12750, status: 'overdue', method: 'bank' },
  { id: 't4', invoice: 'INV-2038', customer: 'Gupta Clinic', date: iso(-1), amount: 3320, status: 'paid', method: 'card' },
  { id: 't5', invoice: 'INV-2037', customer: 'Pooja Selections', date: iso(-2), amount: 5990, status: 'paid', method: 'upi' },
  { id: 't6', invoice: 'INV-2036', customer: 'Md. Irfan', date: iso(-3), amount: 1180, status: 'pending', method: 'cash' },
  { id: 't7', invoice: 'INV-2035', customer: 'Sharma General Store', date: iso(-4), amount: 8420, status: 'paid', method: 'bank' },
  { id: 't8', invoice: 'INV-2034', customer: 'Kavita Devi', date: iso(-5), amount: 645, status: 'paid', method: 'upi' },
  { id: 't9', invoice: 'INV-2033', customer: 'Deepak Electronics', date: iso(-6), amount: 15900, status: 'overdue', method: 'bank' },
  { id: 't10', invoice: 'INV-2032', customer: 'Ravi Handloom', date: iso(-7), amount: 4260, status: 'paid', method: 'card' },
  { id: 't11', invoice: 'INV-2031', customer: 'Neha Verma', date: iso(-8), amount: 1980, status: 'paid', method: 'upi' },
  { id: 't12', invoice: 'INV-2030', customer: 'Jai Mata Di Traders', date: iso(-9), amount: 7300, status: 'pending', method: 'cash' },
];

function iso(daysAgo: number, hour = 11): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 24 - (daysAgo * 7) % 40, 0, 0);
  return d.toISOString();
}

export const OUTSTANDING_TOTAL = DEMO_TRANSACTIONS
  .filter((t) => t.status !== 'paid')
  .reduce((sum, t) => sum + t.amount, 0);

/* ------------------------------ suppliers (sample) ------------------------------ */

export const DEMO_SUPPLIERS: DemoSupplier[] = [
  { id: 's1', name: 'Sharma Distributors', company: 'Sharma Distributors Pvt. Ltd.', contactPerson: 'Rajesh Sharma', phone: '9876543210', email: 'sales@sharmadist.example', category: 'grocery', products: 'Atta, Rice, Oil, Salt', terms: 'Net 15', outstanding: 18400, active: true, onTimeRate: 92, totalPurchased: 412000, notes: '' },
  { id: 's2', name: 'Gupta Traders', company: 'Gupta Electronics Traders', contactPerson: 'Sunil Gupta', phone: '9812345678', email: 'sunil@guptatraders.example', category: 'electronics', products: 'LED bulbs, boards, switches', terms: 'Net 30', outstanding: 0, active: true, onTimeRate: 87, totalPurchased: 168500, notes: '' },
  { id: 's3', name: 'Sri Ram Enterprises', company: 'Sri Ram Enterprises', contactPerson: 'Kamal Verma', phone: '9900112233', email: 'kamal@sriram.example', category: 'grocery', products: 'Snacks, biscuits, beverages', terms: 'Cash on delivery', outstanding: 3200, active: true, onTimeRate: 78, totalPurchased: 96500, notes: '' },
  { id: 's4', name: 'Metro Wholesale', company: 'Metro Apparel Wholesale', contactPerson: 'Farhan Ali', phone: '9765432109', email: 'farhan@metrowh.example', category: 'apparel', products: 'Kurtas, sarees, cloth bundles', terms: 'Net 15', outstanding: 9500, active: true, onTimeRate: 95, totalPurchased: 221000, notes: '' },
  { id: 's5', name: 'Verma & Sons', company: 'Verma & Sons Agency', contactPerson: 'Dinesh Verma', phone: '9654321098', email: 'dinesh@vermasons.example', category: 'other', products: 'Stationery, packaging', terms: 'Net 7', outstanding: 0, active: false, onTimeRate: 64, totalPurchased: 38000, notes: '' },
];

/* ------------------------------ offers (sample) ------------------------------ */

function dayOffsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export const DEMO_OFFERS: DemoOffer[] = [
  { id: 'o1', name: 'Oil Combo Week', kind: 'product', scope: 'Fortune Sunflower Oil 1L', discount: 8, start: dayOffsetISO(-4), end: dayOffsetISO(6), minQty: 2, conditions: '', status: 'active', source: 'internal' },
  { id: 'o2', name: 'Bulk Atta — Buy 10 Get 5% Off', kind: 'bulk', scope: 'Aashirvaad Atta 10kg', discount: 5, start: dayOffsetISO(-20), end: dayOffsetISO(10), minQty: 10, conditions: '', status: 'active', source: 'internal' },
  { id: 'o3', name: 'Sharma Distributors Scheme', kind: 'supplier', scope: 'Sharma Distributors', discount: 12, start: dayOffsetISO(-2), end: dayOffsetISO(5), minQty: 20, conditions: 'On orders above ₹25,000', status: 'active', source: 'supplier' },
  { id: 'o4', name: 'Electronics Month-End Sale', kind: 'category', scope: 'electronics', discount: 10, start: dayOffsetISO(-40), end: dayOffsetISO(-5), minQty: 1, conditions: '', status: 'expired', source: 'internal' },
  { id: 'o5', name: 'Diwali Campaign (Draft)', kind: 'campaign', scope: 'All grocery items', discount: 15, start: '', end: '', minQty: 1, conditions: '', status: 'draft', source: 'internal' },
];

/* ------------------------------ orders (sample) ------------------------------ */

export const DEMO_ORDERS: DemoOrder[] = [
  { id: 'po1', no: 'PO-1187', supplierId: 's1', items: [{ productId: 'p3', name: 'Amul Butter 500g', qty: 24, unitPrice: 246 }, { productId: 'p2', name: 'Tata Salt 1kg', qty: 48, unitPrice: 22 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: '', status: 'pending', createdAt: iso(-1), expected: dayOffsetISO(3) },
  { id: 'po2', no: 'PO-1186', supplierId: 's3', items: [{ productId: 'p5', name: 'Parle-G 800g', qty: 30, unitPrice: 71 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: '', status: 'confirmed', createdAt: iso(-2), expected: dayOffsetISO(2) },
  { id: 'po3', no: 'PO-1185', supplierId: 's2', items: [{ productId: 'p7', name: 'LED Bulb 9W', qty: 50, unitPrice: 94 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: 'Deliver at back gate', status: 'dispatched', createdAt: iso(-4), expected: dayOffsetISO(1) },
  { id: 'po4', no: 'PO-1184', supplierId: 's4', items: [{ productId: 'p9', name: 'Cotton Kurta (M)', qty: 12, unitPrice: 432 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: '', status: 'delivered', createdAt: iso(-9), expected: dayOffsetISO(-4) },
  { id: 'po5', no: 'PO-1183', supplierId: 's1', items: [{ productId: 'p4', name: 'Fortune Sunflower Oil 1L', qty: 36, unitPrice: 127 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: '', status: 'cancelled', createdAt: iso(-11), expected: dayOffsetISO(-6) },
  { id: 'po6', no: 'PO-1182', supplierId: 's3', items: [{ productId: 'p6', name: 'Detergent Powder 1kg', qty: 40, unitPrice: 92 }], address: '12/3 Hazratganj Main Road, Lucknow 226001', notes: '', status: 'processing', createdAt: iso(-5), expected: dayOffsetISO(2) },
];

/* ------------------------------ derived analytics ------------------------------ */

export type RangeKey = 'today' | 'week' | 'month' | 'custom';

export function rangeDays(range: RangeKey, custom?: { from: string; to: string }): DayPoint[] {
  if (range === 'custom' && custom?.from && custom?.to) {
    return DEMO_DAYS.filter((d) => d.date >= custom.from && d.date <= custom.to);
  }
  const count = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  return DEMO_DAYS.slice(-count);
}

function sumDays(days: DayPoint[]): { sales: number; expenses: number; orders: number } {
  return days.reduce(
    (acc, d) => ({ sales: acc.sales + d.sales, expenses: acc.expenses + d.expenses, orders: acc.orders + d.orders }),
    { sales: 0, expenses: 0, orders: 0 },
  );
}

export interface Kpis {
  sales: number;
  expenses: number;
  profit: number;
  orders: number;
  lowStock: number;
  outstanding: number;
  prev?: { sales: number; expenses: number; profit: number; orders: number };
}

/** profit is defined as sales − recorded expenses (incl. cost of goods). */
export function computeKpis(range: RangeKey, custom?: { from: string; to: string }): Kpis {
  if (range === 'custom' && custom?.from && custom?.to) {
    const cur = rangeDays('custom', custom);
    const span = Math.max(1, cur.length);
    const last = DEMO_DAYS[DEMO_DAYS.length - 1];
    const fromKey = dateKey(new Date(new Date(custom.from).getTime() - span * 86400000));
    const prevDays = DEMO_DAYS.filter((d) => d.date >= fromKey && d.date < custom.from);
    const prev = prevDays.length ? sumDays(prevDays) : null;
    const curSum = sumDays(cur);
    void last;
    return {
      sales: curSum.sales,
      expenses: curSum.expenses,
      profit: curSum.sales - curSum.expenses,
      orders: curSum.orders,
      lowStock: LOW_STOCK_PRODUCTS.length + OUT_OF_STOCK_PRODUCTS.length,
      outstanding: OUTSTANDING_TOTAL,
      prev: prev ? { ...prev, profit: prev.sales - prev.expenses } : undefined,
    };
  }
  const count = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  const cur = DEMO_DAYS.slice(-count);
  const prevDays = DEMO_DAYS.slice(-count * 2, -count);
  const prev = prevDays.length === count ? sumDays(prevDays) : null;
  const curSum = sumDays(cur);
  return {
    sales: curSum.sales,
    expenses: curSum.expenses,
    profit: curSum.sales - curSum.expenses,
    orders: curSum.orders,
    lowStock: LOW_STOCK_PRODUCTS.length + OUT_OF_STOCK_PRODUCTS.length,
    outstanding: OUTSTANDING_TOTAL,
    prev: prev ? { ...prev, profit: prev.sales - prev.expenses } : undefined,
  };
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface SeriesPoint {
  label: string;
  sales: number;
  profit: number;
  expenses: number;
}

function shortLabel(dateKeyStr: string): string {
  const d = new Date(dateKeyStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function monthLabel(dateKeyStr: string): string {
  const d = new Date(dateKeyStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function aggregateSeries(days: DayPoint[], granularity: Granularity): SeriesPoint[] {
  if (granularity === 'daily') {
    return days.map((d) => ({
      label: shortLabel(d.date),
      sales: d.sales,
      profit: d.sales - d.expenses,
      expenses: d.expenses,
    }));
  }
  const buckets = new Map<string, DayPoint[]>();
  for (const d of days) {
    let key: string;
    if (granularity === 'monthly') {
      key = d.date.slice(0, 7); // YYYY-MM
    } else {
      const dt = new Date(d.date + 'T00:00:00');
      const monday = new Date(dt);
      const day = (dt.getDay() + 6) % 7;
      monday.setDate(dt.getDate() - day);
      key = dateKey(monday);
    }
    const arr = buckets.get(key) ?? [];
    arr.push(d);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries()).map(([key, arr]) => {
    const s = sumDays(arr);
    return {
      label: granularity === 'monthly' ? monthLabel(key + '-01') : `${shortLabel(key)} +7d`,
      sales: s.sales,
      profit: s.sales - s.expenses,
      expenses: s.expenses,
    };
  });
}

export function revenueByCategory(): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const p of DEMO_PRODUCTS) {
    map.set(p.category, (map.get(p.category) ?? 0) + p.price * p.unitsSold);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function topProducts(n = 5): DemoProduct[] {
  return [...DEMO_PRODUCTS].sort((a, b) => b.price * b.unitsSold - a.price * a.unitsSold).slice(0, n);
}

export interface ForecastPoint extends SeriesPoint {
  forecast?: number | null;
}

/**
 * Simple moving-average forecast over the last 14 days (clearly labelled —
 * an estimate, never presented as a guaranteed prediction).
 */
export function demandForecast(granularity: Granularity): { history: SeriesPoint[]; forecast: { label: string; value: number }[] } {
  const days = DEMO_DAYS.slice(-30);
  const history = aggregateSeries(days, granularity);
  const last14 = DEMO_DAYS.slice(-14);
  const avg = last14.reduce((s, d) => s + d.orders, 0) / 14;
  const last = history[history.length - 1];
  return {
    history,
    forecast: [
      { label: last.label, value: last.sales },
      { label: '+1', value: Math.round(avg * 340) },
      { label: '+2', value: Math.round(avg * 345) },
      { label: '+3', value: Math.round(avg * 350) },
    ],
  };
}

/* ------------------------------ notifications ------------------------------ */

export interface DemoNotification {
  id: string;
  key: string;
  params?: Record<string, unknown>;
  link: string;
  tone: 'warn' | 'info' | 'danger' | 'success';
}

export function buildNotifications(t: TFunction): DemoNotification[] {
  const list: DemoNotification[] = [];
  for (const p of OUT_OF_STOCK_PRODUCTS) {
    list.push({ id: `nos-${p.id}`, key: 'dash2.notif.outOfStock', params: { name: p.name }, link: '/dashboard/sales', tone: 'danger' });
  }
  for (const p of LOW_STOCK_PRODUCTS) {
    list.push({
      id: `low-${p.id}`,
      key: 'dash2.notif.lowStock',
      params: { name: p.name, qty: p.stock, level: p.reorderLevel },
      link: '/dashboard/sales',
      tone: 'warn',
    });
  }
  for (const o of DEMO_ORDERS.filter((o) => o.status === 'pending')) {
    list.push({ id: `ord-${o.id}`, key: 'dash2.notif.pendingOrder', params: { no: o.no }, link: '/dashboard/orders', tone: 'info' });
  }
  for (const tr of DEMO_TRANSACTIONS.filter((tr) => tr.status === 'overdue')) {
    list.push({
      id: `ovd-${tr.id}`,
      key: 'dash2.notif.overdue',
      params: { no: tr.invoice, amount: formatINR(tr.amount) },
      link: '/dashboard/sales',
      tone: 'danger',
    });
  }
  const expiring = DEMO_OFFERS.filter((o) => o.status === 'active' && o.end && o.end <= dayOffsetISO(7));
  for (const o of expiring) {
    list.push({ id: `off-${o.id}`, key: 'dash2.notif.offerExpiring', params: { name: o.name, date: o.end }, link: '/dashboard/offers', tone: 'info' });
  }
  const monthSales = DEMO_DAYS.slice(-30).reduce((s, d) => s + d.sales, 0);
  if (monthSales > 300000) {
    list.push({ id: 'milestone', key: 'dash2.notif.milestone', params: { amount: formatINR(monthSales) }, link: '/dashboard', tone: 'success' });
  }
  void t;
  return list;
}

/* ------------------------------ localStorage demo stores ------------------------------ */

export const STORE_KEYS = {
  suppliers: 'vyaparai_demo_suppliers',
  offers: 'vyaparai_demo_offers',
  orders: 'vyaparai_demo_orders',
  sales: 'vyaparai_demo_sales',
  prefs: 'vyaparai_demo_prefs',
} as const;

export function loadStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export function supplierOrders(supplierId: string): DemoOrder[] {
  return DEMO_ORDERS.filter((o) => o.supplierId === supplierId);
}

export function supplierPurchases(supplierId: string): number {
  return supplierOrders(supplierId)
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0), 0);
}

export function orderTotal(o: DemoOrder): number {
  return o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
}
