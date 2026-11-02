/**
 * Ranked horizontal bars in plain HTML: label above, bar scaled to the top value,
 * value at the bar's tip. `onSelect` makes rows clickable.
 */
export function RankedBars({ rows, value, formatValue, detail, onSelect }) {
  const max = Math.max(...rows.map(value), 0) || 1;

  return (
    <ol className="space-y-3">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{row.name}</span>
              {detail && <span className="shrink-0 text-xs text-ink-3">{detail(row)}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-series-1"
                  style={{ width: `${Math.max(2, (value(row) / max) * 100)}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums">
                {formatValue(value(row))}
              </span>
            </div>
          </>
        );

        return (
          <li key={row.id ?? row.name}>
            {onSelect && row.id ? (
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1 text-left transition-colors hover:bg-subtle"
              >
                {content}
              </button>
            ) : (
              <div className="py-1">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
