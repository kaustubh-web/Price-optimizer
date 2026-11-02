import { Check, CircleDashed, Clock, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const STYLES = {
  completed: { icon: Check, className: 'bg-positive-soft text-positive' },
  processing: { icon: CircleDashed, className: 'bg-subtle text-ink-2' },
  pending: { icon: Clock, className: 'bg-warning-soft text-warning' },
  'on-hold': { icon: Clock, className: 'bg-warning-soft text-warning' },
  cancelled: { icon: X, className: 'bg-negative-soft text-negative' },
  refunded: { icon: X, className: 'bg-negative-soft text-negative' },
  failed: { icon: X, className: 'bg-negative-soft text-negative' },
};

/** Status is always shown as icon + label, never colour alone. */
export function OrderStatus({ status }) {
  const { icon: Icon, className } = STYLES[status] ?? STYLES.processing;
  const label = status ? status[0].toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', className)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
