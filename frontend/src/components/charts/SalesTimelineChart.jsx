import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBucket } from '../../lib/format';

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 };

function BucketTooltip({ active, payload, rows }) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-2">{formatBucket(bucket.start, bucket.unit, { long: true })}</p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-ink-2">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value(bucket)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Column chart over contiguous time buckets (see lib/sales buildTimeline).
 * `tooltipRows` is [{ label, value: (bucket) => string }].
 */
export default function SalesTimelineChart({ data, dataKey, formatAxis, tooltipRows, height = 240, yAxisWidth = 52 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="start"
          tickFormatter={(start) => formatBucket(start, data[0]?.unit)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--axis)' }}
          minTickGap={16}
        />
        <YAxis
          width={yAxisWidth}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxis}
          allowDecimals={false}
        />
        <Tooltip
          content={<BucketTooltip rows={tooltipRows} />}
          cursor={{ fill: 'var(--subtle)' }}
          isAnimationActive={false}
        />
        <Bar dataKey={dataKey} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}
