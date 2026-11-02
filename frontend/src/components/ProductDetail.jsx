import { ArrowDownRight, ArrowRight, ArrowUpRight, Info, LoaderCircle, Minus, Play, TriangleAlert } from 'lucide-react';
import { domAnimation, LazyMotion, m } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { formatDate, formatINR, formatNumber, formatPercent, formatRelative } from '../lib/format';
import { describeElasticity, productSales } from '../lib/insights';
import { productTimeline, stateName } from '../lib/sales';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card, CardHeader } from './ui/Card';
import { OrderStatus } from './ui/OrderStatus';
import { Skeleton } from './ui/Skeleton';
import { Tooltip } from './ui/Tooltip';

// Recharts is most of the bundle; load it only once a chart is on screen.
const ProductSalesChart = lazy(() => import('./charts/ProductSalesChart'));
const RevenueCurveChart = lazy(() => import('./charts/RevenueCurveChart'));

const fade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

/** `tone="outcome"` colours by good/bad; price and demand moves aren't good or bad in themselves. */
function Delta({ value, tone = 'neutral', className }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const color = tone === 'outcome' && value !== 0 ? (value > 0 ? 'text-positive' : 'text-negative') : 'text-ink-2';
  return (
    <span className={cn('inline-flex items-center gap-0.5 tabular-nums', color, className)}>
      <Icon className="size-4" aria-hidden="true" />
      {formatPercent(value)}
    </span>
  );
}

function Metric({ label, hint, children, detail }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <p className="flex items-center gap-1 text-[13px] text-ink-3">
        {label}
        {hint && (
          <Tooltip content={hint}>
            <button type="button" className="rounded text-ink-3 hover:text-ink" aria-label={`About ${label}`}>
              <Info className="size-3.5" />
            </button>
          </Tooltip>
        )}
      </p>
      <div className="mt-1 text-xl font-semibold tracking-tight">{children}</div>
      {detail && <p className="mt-0.5 text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

const CONFIDENCE_STYLE = {
  high: 'bg-positive-soft text-positive',
  medium: 'bg-subtle text-ink-2',
  low: 'bg-warning-soft text-warning',
};

function ModelEvidence({ model }) {
  const fitted = model.elasticitySource === 'fitted';
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
      <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-medium', CONFIDENCE_STYLE[model.confidence])}>
        {model.confidence[0].toUpperCase() + model.confidence.slice(1)} confidence
      </span>
      {fitted
        ? `Elasticity fitted from ${model.dataPoints} price points in your orders (R² ${model.rSquared?.toFixed(2)}).`
        : 'Based on a category benchmark. Sales so far happened at too few different prices to fit this product’s own demand curve.'}
    </p>
  );
}

function Recommendation({ product, analysis }) {
  const { recommendation: rec, model } = analysis;
  const priceChange = ((rec.recommendedPrice - rec.currentPrice) / rec.currentPrice) * 100;
  const elasticity = describeElasticity(rec.elasticityScore);
  const stale = Math.abs(rec.currentPrice - product.currentPrice) >= 0.5;

  return (
    <div className="space-y-4">
      {stale && (
        <p className="flex gap-2 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          The price has changed since this analysis (it was {formatINR(rec.currentPrice, { precise: true })}). Run it
          again for an up-to-date recommendation.
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-4 pt-5">
          <div>
            <p className="text-[13px] text-ink-3">Recommended price</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight">
                {formatINR(rec.recommendedPrice, { precise: true })}
              </span>
              <Delta value={priceChange} className="text-sm font-medium" />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-3">
              {formatINR(rec.currentPrice, { precise: true })}
              <ArrowRight className="size-3.5" aria-label="to" />
              {formatINR(rec.recommendedPrice, { precise: true })}
            </p>
          </div>
          <p className="text-xs text-ink-3">Analysed {formatRelative(rec.createdAt)}</p>
        </div>

        <div className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-3">
          <Metric label="Price elasticity" hint={elasticity.summary} detail={elasticity.label}>
            <span className="tabular-nums">{rec.elasticityScore.toFixed(2)}</span>
          </Metric>
          <Metric label="Projected unit demand" detail="at the recommended price">
            <Delta value={rec.predictedDemandChange} />
          </Metric>
          <Metric label="Projected revenue" detail="vs. the current price">
            <Delta value={rec.predictedRevenueChange} tone="outcome" />
          </Metric>
        </div>

        <div className="border-t border-line px-5 py-4">
          <h3 className="text-sm font-medium">Why this price</h3>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-2">{rec.rationale}</p>
          <div className="mt-3">
            {model ? (
              <ModelEvidence model={model} />
            ) : (
              <p className="text-[13px] text-ink-3">
                Run the analysis again to see model confidence and the demand curve.
              </p>
            )}
          </div>
        </div>
      </Card>

      {model?.demandCurve?.length > 0 && (
        <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
          <RevenueCurveChart
            curve={model.demandCurve}
            currentPrice={rec.currentPrice}
            recommendedPrice={rec.recommendedPrice}
          />
        </Suspense>
      )}
    </div>
  );
}

function AnalysisPending() {
  return (
    <Card className="space-y-4 p-5" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-ink-2">
        <LoaderCircle className="size-4 animate-spin" />
        Fitting the demand model and drafting an explanation…
      </div>
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </Card>
  );
}

function NoAnalysis({ onRun, disabled }) {
  const steps = [
    ['Estimate elasticity', 'from the prices this product has sold at, or a category benchmark when history is thin.'],
    ['Find the revenue peak', 'within ±30% of today’s price, where the evidence is.'],
    ['Explain the move', 'in plain language with Gemini, so you can decide quickly.'],
  ];
  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium">No analysis yet</h3>
      <ol className="mt-3 space-y-2.5">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3 text-sm">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] tabular-nums text-ink-2">
              {i + 1}
            </span>
            <p className="text-ink-2">
              <span className="font-medium text-ink">{title}</span> {body}
            </p>
          </li>
        ))}
      </ol>
      <Button variant="primary" className="mt-5" onClick={onRun} disabled={disabled}>
        <Play className="size-3.5" />
        Run analysis
      </Button>
    </Card>
  );
}

function SalesAndHistory({ product }) {
  const [now] = useState(() => Date.now());
  const sales = productSales(product);
  const timeline = productTimeline(product, now);
  const recentLines = [...(product.orderItems ?? [])]
    .filter((item) => item.order)
    .sort((a, b) => new Date(b.order.orderDate) - new Date(a.order.orderDate))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader title="Sales history" description="Completed and processing orders from WooCommerce" />
      <dl className="mt-3 grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
        {[
          ['Units sold', formatNumber(sales.units)],
          ['Orders', formatNumber(sales.orders)],
          ['Revenue', formatINR(sales.revenue)],
          ['Avg. selling price', sales.units ? formatINR(sales.revenue / sales.units) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-5 py-3">
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="px-2 pb-2 pt-4">
        {timeline.length > 1 ? (
          <Suspense fallback={<Skeleton className="mx-3 h-72" />}>
            <ProductSalesChart timeline={timeline} />
          </Suspense>
        ) : (
          <p className="px-3 py-4 text-[13px] text-ink-3">
            Not enough history to chart yet. It builds up as orders come in and prices change between syncs.
          </p>
        )}
      </div>

      {recentLines.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-5 pb-1 pt-4 text-sm font-medium">Recent orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Qty × price</th>
                  <th className="px-5 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentLines.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-5 py-2 text-ink-2">{formatDate(item.order.orderDate)}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {[item.order.customerCity, stateName(item.order.customerState)].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {item.quantity} × {formatINR(item.priceAtPurchase, { precise: true })}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <OrderStatus status={item.order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ProductDetail({ product, analysis, analysing, analysisBusy, onRun }) {
  if (!product) {
    return (
      <Card className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-ink-3">
        Select a product to see its pricing analysis.
      </Card>
    );
  }

  const inStock = product.stockStatus === 'instock';

  return (
    // Keyed fade-in only: no exit animation, so the outgoing product's buttons
    // are never clickable after the selection has changed.
    <LazyMotion features={domAnimation} strict>
      <m.div key={product.id} {...fade} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {(product.categories ?? []).map((category) => (
                <span key={category} className="rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-2">
                  {category}
                </span>
              ))}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-balance">{product.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
              <span>{formatINR(product.currentPrice, { precise: true })}</span>
              {product.salePrice != null && product.salePrice < product.regularPrice && (
                <span className="line-through">{formatINR(product.regularPrice, { precise: true })}</span>
              )}
              <span>·</span>
              <span className={cn(!inStock && 'text-negative')}>{inStock ? 'In stock' : 'Out of stock'}</span>
              {product.sku && (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs">{product.sku}</span>
                </>
              )}
            </p>
          </div>
          {analysis && (
            <Button onClick={onRun} disabled={analysisBusy}>
              {analysing ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-3.5" />}
              {analysing ? 'Analysing…' : 'Run again'}
            </Button>
          )}
        </div>

        <m.div key={analysing ? 'pending' : (analysis?.recommendation.id ?? 'empty')} {...fade}>
          {analysing ? (
            <AnalysisPending />
          ) : analysis ? (
            <Recommendation product={product} analysis={analysis} />
          ) : (
            <NoAnalysis onRun={onRun} disabled={analysisBusy} />
          )}
        </m.div>

        <SalesAndHistory product={product} />
      </m.div>
    </LazyMotion>
  );
}
