import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBucket, formatCompactINR, formatINR, formatNumber } from '../../lib/format';
import SalesTimelineChart from './SalesTimelineChart';

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 };
const Y_AXIS_WIDTH = 52;

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-2">{formatBucket(bucket.start, bucket.unit, { long: true })}</p>
      <p className="mt-0.5 font-medium tabular-nums">
        {bucket.price == null ? 'No price recorded' : formatINR(bucket.price, { precise: true })}
      </p>
    </div>
  );
}

/**
 * Units sold and list price as two aligned charts on the same buckets
 * (two measures, two charts; never a dual axis).
 */
export default function ProductSalesChart({ timeline }) {
  const hasPrice = timeline.some((b) => b.price != null);

  return (
    <div className="space-y-4">
      <div>
        <p className="px-3 text-xs font-medium text-ink-2">Units sold</p>
        <SalesTimelineChart
          data={timeline}
          dataKey="units"
          height={150}
          yAxisWidth={Y_AXIS_WIDTH}
          formatAxis={formatNumber}
          tooltipRows={[
            { label: 'Units', value: (b) => formatNumber(b.units) },
            { label: 'Revenue', value: (b) => formatINR(b.revenue) },
          ]}
        />
      </div>

      {hasPrice && (
        <div>
          <p className="px-3 text-xs font-medium text-ink-2">List price</p>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis
                dataKey="start"
                scale="band"
                tickFormatter={(start) => formatBucket(start, timeline[0]?.unit)}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--axis)' }}
                minTickGap={16}
              />
              <YAxis
                width={Y_AXIS_WIDTH}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactINR}
                domain={[(min) => Math.floor(min * 0.9), (max) => Math.ceil(max * 1.05)]}
              />
              <Tooltip content={<PriceTooltip />} cursor={{ stroke: 'var(--line-strong)' }} isAnimationActive={false} />
              <Line
                type="stepAfter"
                dataKey="price"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
