import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border border-line bg-surface', className)} {...props} />;
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-4', className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}
