// Completed and processing orders are real sales; cancelled, refunded, failed
// and unpaid ones are listed but never counted toward revenue or units.
export const COUNTED_STATUSES = new Set(['completed', 'processing']);

export const isCounted = (status) => COUNTED_STATUSES.has(status);

const DAY = 86400000;

export const RANGES = [
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '12m', label: '12M', days: 365 },
  { id: 'all', label: 'All', days: null },
];

function startOfDay(time) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Window for the selected range, plus the equal-length window before it for comparisons. */
export function resolveRange(rangeId, orders, now) {
  const { days } = RANGES.find((r) => r.id === rangeId);
  const to = now;
  if (days) {
    const from = startOfDay(now - (days - 1) * DAY);
    return { from, to, days, previous: { from: from - days * DAY, to: from } };
  }
  const first = orders.length ? Math.min(...orders.map((o) => new Date(o.orderDate).getTime())) : now - 29 * DAY;
  const from = startOfDay(first);
  return { from, to, days: Math.max(1, Math.ceil((to - from) / DAY)), previous: null };
}

export function bucketUnit(days) {
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function bucketStart(time, unit) {
  const d = new Date(startOfDay(time));
  if (unit === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (unit === 'month') d.setDate(1);
  return d.getTime();
}

function nextBucket(time, unit) {
  const d = new Date(time);
  if (unit === 'day') d.setDate(d.getDate() + 1);
  else if (unit === 'week') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

/**
 * Sums `entries` ({ time, ...numeric fields }) into contiguous buckets between
 * `from` and `to`, filling gaps with zeros so the time axis is honest.
 */
export function buildTimeline(entries, { from, to, unit, fields }) {
  const buckets = [];
  const index = new Map();
  for (let t = bucketStart(from, unit); t <= to; t = nextBucket(t, unit)) {
    const bucket = { start: t, unit };
    for (const field of fields) bucket[field] = 0;
    index.set(t, bucket);
    buckets.push(bucket);
  }
  for (const entry of entries) {
    if (entry.time < from || entry.time > to) continue;
    const bucket = index.get(bucketStart(entry.time, unit));
    if (!bucket) continue;
    for (const field of fields) bucket[field] += entry[field] ?? 0;
  }
  return buckets;
}

function itemsRevenue(order) {
  return order.items.reduce((sum, item) => sum + item.total, 0);
}

function itemsUnits(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function totalsFor(orders, from, to) {
  let revenue = 0;
  let units = 0;
  let count = 0;
  for (const order of orders) {
    const time = new Date(order.orderDate).getTime();
    if (time < from || time >= to || !isCounted(order.status)) continue;
    revenue += itemsRevenue(order);
    units += itemsUnits(order);
    count++;
  }
  return { revenue, units, orders: count, aov: count ? revenue / count : 0 };
}

const change = (current, previous) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

export function salesSummary(orders, range) {
  const current = totalsFor(orders, range.from, range.to + 1);
  if (!range.previous) return { current, change: null };
  const previous = totalsFor(orders, range.previous.from, range.previous.to);
  return {
    current,
    change: {
      revenue: change(current.revenue, previous.revenue),
      units: change(current.units, previous.units),
      orders: change(current.orders, previous.orders),
      aov: change(current.aov, previous.aov),
    },
  };
}

export function revenueTimeline(orders, range) {
  const entries = orders
    .filter((o) => isCounted(o.status))
    .map((o) => ({ time: new Date(o.orderDate).getTime(), revenue: itemsRevenue(o), orders: 1, units: itemsUnits(o) }));
  return buildTimeline(entries, { ...range, unit: bucketUnit(range.days), fields: ['revenue', 'orders', 'units'] });
}

function inRange(order, range) {
  const time = new Date(order.orderDate).getTime();
  return time >= range.from && time <= range.to && isCounted(order.status);
}

export function topProducts(orders, range, limit = 5) {
  const byProduct = new Map();
  for (const order of orders) {
    if (!inRange(order, range)) continue;
    for (const item of order.items) {
      const key = item.product?.id ?? `woo-${item.wooCommerceProductId}`;
      const row = byProduct.get(key) ?? {
        id: item.product?.id ?? null,
        name: item.product?.name ?? `Product #${item.wooCommerceProductId}`,
        revenue: 0,
        units: 0,
      };
      row.revenue += item.total;
      row.units += item.quantity;
      byProduct.set(key, row);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function salesByState(orders, range, limit = 6) {
  const byState = new Map();
  for (const order of orders) {
    if (!inRange(order, range)) continue;
    const name = stateName(order.customerState) ?? 'Unknown';
    const row = byState.get(name) ?? { name, revenue: 0, orders: 0 };
    row.revenue += itemsRevenue(order);
    row.orders += 1;
    byState.set(name, row);
  }
  return [...byState.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** Per-bucket units sold and list price for one product, on a shared time axis. */
export function productTimeline(product, now) {
  const lines = (product.orderItems ?? []).filter((item) => item.order && isCounted(item.order.status));
  const history = [...(product.priceHistory ?? [])].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

  const times = [
    ...lines.map((item) => new Date(item.order.orderDate).getTime()),
    ...history.map((h) => new Date(h.changedAt).getTime()),
  ];
  if (!times.length) return [];

  const from = Math.min(...times);
  const days = Math.max(1, Math.ceil((now - from) / DAY));
  const unit = bucketUnit(days);
  const buckets = buildTimeline(
    lines.map((item) => ({
      time: new Date(item.order.orderDate).getTime(),
      units: item.quantity,
      revenue: item.total,
    })),
    { from, to: now, unit, fields: ['units', 'revenue'] },
  );

  // List price in effect at the end of each bucket; null before the first recorded price.
  let cursor = -1;
  for (const bucket of buckets) {
    const end = nextBucket(bucket.start, unit);
    while (cursor + 1 < history.length && new Date(history[cursor + 1].changedAt).getTime() < end) cursor++;
    bucket.price = cursor >= 0 ? history[cursor].effectivePrice : null;
  }
  const last = buckets.at(-1);
  if (last) last.price = product.currentPrice;
  return buckets;
}

const STATES = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DH: 'Dadra and Nagar Haveli and Daman and Diu',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OR: 'Odisha',
  PY: 'Puducherry',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  WB: 'West Bengal',
};

/** WooCommerce stores Indian states as codes (KA, MH, …). */
export function stateName(code) {
  if (!code) return null;
  return STATES[code.toUpperCase()] ?? code;
}
