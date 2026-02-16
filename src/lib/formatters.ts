/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a number as currency
 */
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(num: number, decimals = 0): string {
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format a date string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format a date string as short format
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Calculate percentage change between two numbers
 */
export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format a percentage change with + or - prefix
 */
export function formatPercentChange(current: number, previous: number): string {
  const change = calcPercentChange(current, previous);
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Format growth direction text
 */
export function formatGrowthText(current: number, previous: number): string {
  if (current > previous) return 'increased';
  if (current < previous) return 'decreased';
  return 'unchanged';
}
