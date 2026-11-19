export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const delta = timestamp - now;
  const abs = Math.abs(delta);
  if (abs < 45_000) return 'just now';
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 3_600_000) return formatter.format(Math.round(delta / 60_000), 'minute');
  if (abs < 86_400_000) return formatter.format(Math.round(delta / 3_600_000), 'hour');
  if (abs < 86_400_000 * 30) return formatter.format(Math.round(delta / 86_400_000), 'day');
  return formatDateTime(timestamp);
}
