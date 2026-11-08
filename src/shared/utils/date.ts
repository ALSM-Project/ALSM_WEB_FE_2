/**
 * Date formatting utilities for enterprise CRM & Platform Admin.
 * Handles null, undefined, invalid date strings and numbers gracefully without returning "Invalid Date".
 */

export function isValidDate(d: any): boolean {
  if (d === null || d === undefined || d === '') return false;
  const date = new Date(d);
  return !isNaN(date.getTime());
}

export function toDateSafe(d: any): Date | null {
  if (d === null || d === undefined || d === '') return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(val: any, fallback: string = '—'): string {
  const d = toDateSafe(val);
  if (!d) return fallback;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(val: any, fallback: string = '—'): string {
  const d = toDateSafe(val);
  if (!d) return fallback;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTime(val: any, fallback: string = '—'): string {
  const d = toDateSafe(val);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(val: any, fallback: string = 'Just now'): string {
  const d = toDateSafe(val);
  if (!d) return fallback;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(d, fallback);
}
