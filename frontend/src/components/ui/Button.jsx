import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-ink text-surface hover:bg-ink/85 disabled:bg-ink/60',
  secondary: 'border border-line bg-surface text-ink hover:bg-subtle hover:border-line-strong',
  ghost: 'text-ink-2 hover:bg-subtle hover:text-ink',
};

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'size-9 justify-center',
};

export function Button({ variant = 'secondary', size = 'md', className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
