export const MONITOR_INTERVALS = [60, 360, 1440] as const;

export type MonitorInterval = (typeof MONITOR_INTERVALS)[number];

export const DEFAULT_INTERVAL_MINUTES: MonitorInterval = 60;
export const SCHEDULER_TICK_MINUTES = 30;
export const MAX_EXTRACTED_CHARACTERS = 500_000;
export const MAX_HTML_BYTES = 2_000_000;
export const FETCH_TIMEOUT_MS = 20_000;
export const MAX_REDIRECTS = 5;
export const MAX_CONCURRENT_CHECKS = 2;
export const HOST_REQUEST_GAP_MS = 2_000;
export const CHECK_LOCK_MS = 90_000;
export const DEFAULT_SNAPSHOT_RETENTION = 30;
export const MIN_SNAPSHOT_RETENTION = 5;
export const MAX_SNAPSHOT_RETENTION = 100;
export const MIN_CONTENT_CHARACTERS = 40;

export function isMonitorInterval(value: number): value is MonitorInterval {
  return (MONITOR_INTERVALS as readonly number[]).includes(value);
}

export function intervalLabel(minutes: number): string {
  if (minutes === 60) return 'Every hour';
  if (minutes === 360) return 'Every 6 hours';
  if (minutes === 1440) return 'Every 24 hours';
  return `Every ${minutes} minutes`;
}
