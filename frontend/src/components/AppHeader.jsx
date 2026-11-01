import { Moon, RefreshCw, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path
        d="M7 23C10 12 13.5 9 16 9s6 3 9 14"
        className="stroke-surface"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="9" r="3" className="fill-series-2 stroke-ink" strokeWidth="1.5" />
    </svg>
  );
}

const STATUS = {
  connecting: { label: 'Connecting', dot: 'bg-warning animate-pulse' },
  online: { label: 'Connected', dot: 'bg-positive' },
  offline: { label: 'Offline', dot: 'bg-negative' },
};

export function AppHeader({ status, onSync, syncing, theme, onToggleTheme }) {
  const { label, dot } = STATUS[status];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-semibold tracking-tight">Price Optimizer</span>
          <span className="hidden text-sm text-ink-3 md:inline">
            Revenue-maximising prices for your WooCommerce store
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs text-ink-2 sm:flex">
            <span className={cn('size-1.5 rounded-full', dot)} />
            {label}
          </span>
          <Tooltip content={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </Tooltip>
          <Button onClick={onSync} disabled={syncing}>
            <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
            <span>{syncing ? 'Syncing…' : 'Sync store'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
