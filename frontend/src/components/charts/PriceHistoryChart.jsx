import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactINR, formatINR, formatShortDate } from '../../lib/format';

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 };

function HistoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-2">{point.isNow ? 'Today' : formatShortDate(point.time)}</p>
      <p className="mt-0.5 font-medium tabular-nums">{formatINR(point.price, { precise: true })}</p>
    </div>
  );
}

/** `history` is newest-first, as the API returns it. */
export default function PriceHistoryChart({ history, currentPrice }) {
  const [now] = useState(() => Date.now());
  const points = [...history]
    .reverse()
    .map((h) => ({ time: new Date(h.changedAt).getTime(), price: h.effectivePrice }));
  // Extend the last step to today so the current price reads as ongoing.
  points.push({ time: now, price: currentPrice, isNow: true });

  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatShortDate}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--axis)' }}
          minTickGap={24}
        />
        <YAxis
          width={52}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCompactINR}
          domain={[(min) => Math.floor(min * 0.9), (max) => Math.ceil(max * 1.05)]}
        />
        <Tooltip content={<HistoryTooltip />} cursor={{ stroke: 'var(--line-strong)' }} isAnimationActive={false} />
        <Line
          type="stepAfter"
          dataKey="price"
          stroke="var(--series-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
