import { ArrowDownRight, ArrowUpRight, CircleAlert, PackageOpen, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatINR, formatPercent } from '../lib/format';
import { primaryCategory } from '../lib/insights';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

function LatestRecommendation({ product }) {
  const rec = product.recommendations?.[0];
  if (!rec) return <span className="text-xs text-ink-3">Not analysed</span>;

  const lower = rec.recommendedPrice < rec.currentPrice;
  const Arrow = lower ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
      <Arrow className="size-3.5 text-ink-3" aria-label={lower ? 'Lower to' : 'Raise to'} />
      <span className="tabular-nums">{formatINR(rec.recommendedPrice)}</span>
      <span className={cn('tabular-nums', rec.predictedRevenueChange >= 0 ? 'text-positive' : 'text-negative')}>
        {formatPercent(rec.predictedRevenueChange)}
      </span>
    </span>
  );
}

function ProductRow({ product, selected, onSelect }) {
  const inStock = product.stockStatus === 'instock';
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(product.id)}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'relative grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3 text-left transition-colors',
          'hover:bg-subtle focus-visible:-outline-offset-2',
          selected &&
            'bg-subtle before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ink',
        )}
      >
        <span className="truncate text-sm font-medium">{product.name}</span>
        <span className="text-right text-sm tabular-nums">{formatINR(product.currentPrice, { precise: true })}</span>
        <span className="truncate text-xs text-ink-3">
          {primaryCategory(product)}
          <span className="mx-1.5">·</span>
          <span className={cn(!inStock && 'text-negative')}>
            {inStock
              ? product.stockQuantity != null
                ? `${product.stockQuantity} in stock`
                : 'In stock'
              : 'Out of stock'}
          </span>
        </span>
        <span className="text-right">
          <LatestRecommendation product={product} />
        </span>
      </button>
    </li>
  );
}

function ListMessage({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon className="size-5 text-ink-3" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <div className="mt-1 max-w-xs text-[13px] text-ink-3">{children}</div>
    </div>
  );
}

export function ProductList({ products, status, error, selectedId, onSelect, onRetry, onSync, syncing }) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.categories?.some((c) => c.toLowerCase().includes(q)),
    );
  }, [products, query]);

  return (
    <Card className="flex flex-col overflow-hidden lg:max-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-sm font-medium">Catalog</h2>
        {status === 'success' && <span className="text-xs tabular-nums text-ink-3">{products.length} products</span>}
      </div>

      <div className="px-5 pb-3 pt-3">
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or category"
            className="h-9 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-sm placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
        {status === 'pending' && (
          <ul className="divide-y divide-line" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="space-y-2 px-5 py-3.5">
                <div className="flex justify-between gap-6">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </li>
            ))}
          </ul>
        )}

        {status === 'error' && (
          <ListMessage icon={CircleAlert} title="Couldn't load products">
            <p>{error?.message}</p>
            <Button size="sm" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          </ListMessage>
        )}

        {status === 'success' && products.length === 0 && (
          <ListMessage icon={PackageOpen} title="No products yet">
            <p>Sync your store to pull products and orders from WooCommerce.</p>
            <Button size="sm" variant="primary" className="mt-4" onClick={onSync} disabled={syncing}>
              <RefreshCw className={cn('size-3.5', syncing && 'animate-spin')} />
              Sync store
            </Button>
          </ListMessage>
        )}

        {status === 'success' && products.length > 0 && visible.length === 0 && (
          <ListMessage icon={Search} title="No matches">
            <p>Nothing in the catalog matches “{query}”.</p>
          </ListMessage>
        )}

        {status === 'success' && visible.length > 0 && (
          <ul className="divide-y divide-line">
            {visible.map((product) => (
              <ProductRow key={product.id} product={product} selected={product.id === selectedId} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
