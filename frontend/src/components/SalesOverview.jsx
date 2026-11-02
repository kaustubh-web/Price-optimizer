import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleAlert, Minus, PackageOpen, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { formatCompactINR, formatDate, formatINR, formatNumber, formatPercent } from '../lib/format';
import {
  RANGES,
  resolveRange,
  revenueTimeline,
  salesByState,
  salesSummary,
  stateName,
  topProducts,
} from '../lib/sales';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card, CardHeader } from './ui/Card';
import { OrderStatus } from './ui/OrderStatus';
import { RankedBars } from './ui/RankedBars';
import { Segmented } from './ui/Segmented';
import { Skeleton } from './ui/Skeleton';

const SalesTimelineChart = lazy(() => import('./charts/SalesTimelineChart'));

function Change({ value, label }) {
  if (value == null) return <span className="text-ink-3">No prior data</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center tabular-nums',
          value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-ink-2',
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {formatPercent(value)}
      </span>
      <span className="text-ink-3">{label}</span>
    </span>
  );
}

function Kpi({ label, value, change, changeLabel, loading }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      )}
      <p className="mt-1 truncate text-xs">
        {loading ? ' ' : changeLabel ? <Change value={change} label={changeLabel} /> : ' '}
      </p>
    </div>
  );
}

function PricingOpportunities({ products, onOpenProduct }) {
  const analysed = products
    .filter((p) => p.recommendations?.[0])
    .map((p) => ({ product: p, rec: p.recommendations[0] }))
    .sort((a, b) => b.rec.predictedRevenueChange - a.rec.predictedRevenueChange)
    .slice(0, 5);
  const unanalysed = products.filter((p) => !p.recommendations?.[0]).length;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Pricing opportunities" description="Largest projected revenue gains from repricing" />
      <div className="flex-1 px-5 pb-2 pt-3">
        {analysed.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-3">
            No products analysed yet. Run an analysis from the Products tab.
          </p>
        ) : (
          <ul className="-mx-2">
            {analysed.map(({ product, rec }) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onOpenProduct(product.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-subtle"
                >
                  <span className="truncate text-sm">{product.name}</span>
                  <span
                    className={cn(
                      'text-right text-sm font-medium tabular-nums',
                      rec.predictedRevenueChange >= 0 ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {formatPercent(rec.predictedRevenueChange)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink-3 tabular-nums">
                    {formatINR(rec.currentPrice)}
                    <ArrowRight className="size-3" aria-label="to" />
                    {formatINR(rec.recommendedPrice)}
                  </span>
                  <span className="text-right text-xs text-ink-3">revenue</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {unanalysed > 0 && (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-3">
          {unanalysed} {unanalysed === 1 ? 'product has' : 'products have'} not been analysed yet.
        </p>
      )}
    </Card>
  );
}

function LatestOrders({ orders }) {
  const [visible, setVisible] = useState(8);
  const shown = orders.slice(0, visible);

  return (
    <Card>
      <CardHeader
        title="Latest orders"
        description="All statuses; only completed and processing orders count as sales"
      />
      <div className="mt-3 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-subtle/60 text-left text-xs text-ink-2">
            <tr>
              <th className="px-5 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Items</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-5 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((order) => {
              const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const first = order.items[0];
              return (
                <tr key={order.id}>
                  <td className="px-5 py-2.5 font-mono text-xs">#{order.wooCommerceId}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(order.orderDate)}</td>
                  <td className="px-3 py-2.5 text-ink-2">
                    {[order.customerCity, stateName(order.customerState)].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="max-w-56 px-3 py-2.5">
                    <span className="block truncate">
                      {first?.product?.name ?? `Product #${first?.wooCommerceProductId}`}
                    </span>
                    <span className="text-xs text-ink-3">
                      {units} {units === 1 ? 'unit' : 'units'}
                      {order.items.length > 1 &&
                        ` · ${order.items.length - 1} more ${order.items.length === 2 ? 'item' : 'items'}`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <OrderStatus status={order.status} />
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {formatINR(order.totalAmount, { precise: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {orders.length > visible && (
        <div className="border-t border-line px-5 py-2.5">
          <Button size="sm" variant="ghost" onClick={() => setVisible((v) => v + 10)}>
            Show more ({orders.length - visible} remaining)
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SalesOverview({ ordersQuery, products, onOpenProduct, onSync, syncing }) {
  const [rangeId, setRangeId] = useState('90d');
  const [now] = useState(() => Date.now());
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const loading = ordersQuery.isPending;

  const range = useMemo(() => resolveRange(rangeId, orders, now), [rangeId, orders, now]);
  const summary = useMemo(() => salesSummary(orders, range), [orders, range]);
  const timeline = useMemo(() => revenueTimeline(orders, range), [orders, range]);
  const top = useMemo(() => topProducts(orders, range), [orders, range]);
  const states = useMemo(() => salesByState(orders, range), [orders, range]);

  const rangeLabel = range.previous ? `vs. prior ${range.days}d` : null;
  const periodEmpty = summary.current.orders === 0;

  if (ordersQuery.isError) {
    return (
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <CircleAlert className="size-5 text-ink-3" />
        <p className="mt-3 text-sm font-medium">Couldn't load orders</p>
        <p className="mt-1 text-[13px] text-ink-3">{ordersQuery.error?.message}</p>
        <Button size="sm" className="mt-4" onClick={() => ordersQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (ordersQuery.isSuccess && orders.length === 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <PackageOpen className="size-5 text-ink-3" />
        <p className="mt-3 text-sm font-medium">No orders yet</p>
        <p className="mt-1 max-w-xs text-[13px] text-ink-3">
          Sync your store to pull order history from WooCommerce. Sales charts appear here once orders exist.
        </p>
        <Button size="sm" variant="primary" className="mt-4" onClick={onSync} disabled={syncing}>
          <RefreshCw className={cn('size-3.5', syncing && 'animate-spin')} />
          Sync store
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Sales</h2>
          <p className="text-[13px] text-ink-3">Completed and processing orders</p>
        </div>
        <Segmented label="Date range" options={RANGES} value={rangeId} onChange={setRangeId} />
      </div>

      <section
        aria-label="Sales summary"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4"
      >
        <Kpi
          loading={loading}
          label="Revenue"
          value={formatINR(summary.current.revenue)}
          change={summary.change?.revenue}
          changeLabel={rangeLabel}
        />
        <Kpi
          loading={loading}
          label="Orders"
          value={formatNumber(summary.current.orders)}
          change={summary.change?.orders}
          changeLabel={rangeLabel}
        />
        <Kpi
          loading={loading}
          label="Units sold"
          value={formatNumber(summary.current.units)}
          change={summary.change?.units}
          changeLabel={rangeLabel}
        />
        <Kpi
          loading={loading}
          label="Avg. order value"
          value={formatINR(summary.current.aov)}
          change={summary.change?.aov}
          changeLabel={rangeLabel}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue over time"
            description={`Per ${timeline[0]?.unit ?? 'day'}, from completed and processing orders`}
          />
          <div className="px-2 pb-3 pt-3">
            {loading ? (
              <Skeleton className="mx-3 h-72" />
            ) : periodEmpty ? (
              <div className="flex h-72 flex-col items-center justify-center text-center text-[13px] text-ink-3">
                No sales in this period.
                <Button size="sm" className="mt-3" onClick={() => setRangeId('all')}>
                  Show all time
                </Button>
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="mx-3 h-72" />}>
                <SalesTimelineChart
                  data={timeline}
                  dataKey="revenue"
                  height={290}
                  formatAxis={formatCompactINR}
                  tooltipRows={[
                    { label: 'Revenue', value: (b) => formatINR(b.revenue) },
                    { label: 'Orders', value: (b) => formatNumber(b.orders) },
                    { label: 'Units', value: (b) => formatNumber(b.units) },
                  ]}
                />
              </Suspense>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top products" description="By revenue in this period" />
          <div className="px-5 pb-4 pt-3">
            {loading ? (
              <Skeleton className="h-48" />
            ) : top.length ? (
              <RankedBars
                rows={top}
                value={(row) => row.revenue}
                formatValue={(v) => formatINR(v)}
                detail={(row) => `${formatNumber(row.units)} units`}
                onSelect={onOpenProduct}
              />
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-3">No sales in this period.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sales by state" description="Where this period's revenue came from" />
          <div className="px-5 pb-4 pt-3">
            {loading ? (
              <Skeleton className="h-48" />
            ) : states.length ? (
              <RankedBars
                rows={states}
                value={(row) => row.revenue}
                formatValue={(v) => formatINR(v)}
                detail={(row) => `${row.orders} ${row.orders === 1 ? 'order' : 'orders'}`}
              />
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-3">No sales in this period.</p>
            )}
          </div>
        </Card>

        <PricingOpportunities products={products} onOpenProduct={onOpenProduct} />
      </div>

      {!loading && <LatestOrders orders={orders} />}
    </div>
  );
}
