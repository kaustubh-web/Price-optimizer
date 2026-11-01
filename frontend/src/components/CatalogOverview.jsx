import { formatINR, formatNumber, formatPercent } from '../lib/format';
import { Skeleton } from './ui/Skeleton';

function Stat({ label, value, detail, loading }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      )}
      <p className="mt-0.5 truncate text-xs text-ink-3">{loading ? ' ' : detail}</p>
    </div>
  );
}

export function CatalogOverview({ summary, loading }) {
  const s = summary;
  return (
    <section
      aria-label="Catalog overview"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4"
    >
      <Stat
        loading={loading}
        label="Products"
        value={formatNumber(s.products)}
        detail={`${formatNumber(s.inStock)} in stock`}
      />
      <Stat
        loading={loading}
        label="Units sold"
        value={formatNumber(s.units)}
        detail={`across ${formatNumber(s.orders)} orders`}
      />
      <Stat loading={loading} label="Order revenue" value={formatINR(s.revenue)} detail="from synced orders" />
      <Stat
        loading={loading}
        label="Analysed"
        value={`${s.analysed} of ${s.products}`}
        detail={
          s.averageUplift == null ? 'no analyses yet' : `avg. ${formatPercent(s.averageUplift)} revenue`
        }
      />
    </section>
  );
}
