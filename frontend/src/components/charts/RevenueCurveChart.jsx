import { ChartSpline, Table2 } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactINR, formatINR } from '../../lib/format';
import { cn } from '../../lib/utils';
import { Card, CardHeader } from '../ui/Card';

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 };
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: 'var(--surface)' };

function CurveTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-medium tabular-nums">{formatINR(point.price)}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
        <dt className="flex items-center gap-1.5 text-ink-2">
          <span className="size-2 rounded-full bg-series-1" /> Revenue
        </dt>
        <dd className="text-right tabular-nums">{point.revenue_index.toFixed(1)}</dd>
        <dt className="flex items-center gap-1.5 text-ink-2">
          <span className="size-2 rounded-full bg-series-2" /> Demand
        </dt>
        <dd className="text-right tabular-nums">{point.demand_index.toFixed(1)}</dd>
      </dl>
    </div>
  );
}

function LegendKey({ colorClass, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-0.5 w-3 rounded-full', colorClass)} />
      {label}
    </span>
  );
}

function ViewToggle({ view, onChange }) {
  const options = [
    { id: 'chart', label: 'Chart', icon: ChartSpline },
    { id: 'table', label: 'Table', icon: Table2 },
  ];
  return (
    <div role="radiogroup" aria-label="View" className="flex rounded-lg border border-line p-0.5">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          aria-label={label}
          onClick={() => onChange(id)}
          className={cn(
            'flex size-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:text-ink',
            view === id && 'bg-subtle text-ink',
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

export default function RevenueCurveChart({ curve, currentPrice, recommendedPrice }) {
  const [view, setView] = useState('chart');
  const samePrice = Math.abs(recommendedPrice - currentPrice) < 0.5;

  const peak = Math.max(...curve.map((p) => Math.max(p.revenue_index, p.demand_index)));
  const step = peak > 300 ? 100 : 50;
  const yTicks = Array.from({ length: Math.ceil(peak / step) + 1 }, (_, i) => i * step);

  // Labels face away from each other; the recommended one flips inward when it
  // sits near the edge of the plot so it never gets clipped.
  const lower = recommendedPrice < currentPrice;
  const minPrice = curve[0].price;
  const position = (recommendedPrice - minPrice) / (curve.at(-1).price - minPrice);
  const RIGHT_OF_LINE = 'insideTopLeft';
  const LEFT_OF_LINE = 'insideTopRight';
  const recommendedSide = lower
    ? position > 0.15
      ? LEFT_OF_LINE
      : RIGHT_OF_LINE
    : position < 0.85
      ? RIGHT_OF_LINE
      : LEFT_OF_LINE;
  const currentSide = lower ? RIGHT_OF_LINE : LEFT_OF_LINE;

  return (
    <Card>
      <CardHeader
        title="Projected revenue across prices"
        description="Indexed to 100 at the current price"
        action={<ViewToggle view={view} onChange={setView} />}
      />

      {view === 'chart' ? (
        <div className="px-2 pb-3 pt-2">
          <div className="flex gap-4 px-3 pb-1 text-xs text-ink-2">
            <LegendKey colorClass="bg-series-1" label="Revenue" />
            <LegendKey colorClass="bg-series-2" label="Unit demand" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={curve} margin={{ top: 22, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis
                dataKey="price"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatCompactINR}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--axis)' }}
                tickCount={6}
              />
              <YAxis
                width={36}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                domain={[0, yTicks.at(-1)]}
                ticks={yTicks}
              />
              <Tooltip content={<CurveTooltip />} cursor={{ stroke: 'var(--line-strong)' }} isAnimationActive={false} />
              {!samePrice && (
                <ReferenceLine
                  x={currentPrice}
                  stroke="var(--ink-3)"
                  label={{ value: 'Current', position: currentSide, fill: 'var(--ink-3)', fontSize: 11 }}
                />
              )}
              <ReferenceLine
                x={recommendedPrice}
                stroke="var(--ink)"
                label={{
                  value: samePrice ? 'Current = recommended' : 'Recommended',
                  position: recommendedSide,
                  fill: 'var(--ink)',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue_index"
                name="Revenue"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="var(--series-1)"
                fillOpacity={0.1}
                activeDot={ACTIVE_DOT}
                animationDuration={500}
              />
              <Line
                type="monotone"
                dataKey="demand_index"
                name="Unit demand"
                stroke="var(--series-2)"
                strokeWidth={2}
                dot={false}
                activeDot={ACTIVE_DOT}
                animationDuration={500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mx-5 mb-4 mt-3 max-h-72 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-subtle text-xs text-ink-2">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Unit demand</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {curve.map((point) => (
                <tr key={point.price}>
                  <td className="px-3 py-1.5">{formatINR(point.price, { precise: true })}</td>
                  <td className="px-3 py-1.5 text-right">{point.demand_index.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right">{point.revenue_index.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
