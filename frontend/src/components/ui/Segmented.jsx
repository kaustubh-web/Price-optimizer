import { cn } from '../../lib/utils';

/** Small radio-style toggle, e.g. a date-range picker. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'h-7 rounded-md px-2.5 text-xs font-medium text-ink-3 transition-colors hover:text-ink',
            value === option.id && 'bg-subtle text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
