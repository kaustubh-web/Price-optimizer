const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrPrecise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('en-IN');
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const fullDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatINR(value, { precise = false } = {}) {
  if (value == null || Number.isNaN(value)) return '—';
  return (precise && !Number.isInteger(value) ? inrPrecise : inr).format(value);
}

export function formatCompactINR(value) {
  return value < 1000 ? inr.format(value) : inrCompact.format(value);
}

export function formatNumber(value) {
  return integer.format(value ?? 0);
}

export function formatPercent(value, { signed = true, digits = 1 } = {}) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = signed && value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatShortDate(date) {
  return shortDate.format(new Date(date));
}

export function formatDate(date) {
  return fullDate.format(new Date(date));
}

/** Axis tick (`long: false`) or tooltip title (`long: true`) for a timeline bucket. */
export function formatBucket(start, unit, { long = false } = {}) {
  if (unit === 'month') return (long ? monthYear : monthShort).format(new Date(start));
  if (unit === 'week' && long) return `Week of ${shortDate.format(new Date(start))}`;
  return shortDate.format(new Date(start));
}

const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(date) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
