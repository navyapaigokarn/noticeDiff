import { CHECK_LOCK_MS } from '@/config/monitoring';
import type { MonitoredWebsite } from '@/types/monitor.types';

export function isMonitorDue(monitor: Pick<MonitoredWebsite, 'status' | 'nextCheckAt'>, now: number): boolean {
  return monitor.status === 'ACTIVE' && (monitor.nextCheckAt ?? 0) <= now;
}

export function isCheckLocked(checkInProgressAt: number | null | undefined, now: number): boolean {
  if (!checkInProgressAt) return false;
  return now - checkInProgressAt < CHECK_LOCK_MS;
}

/**
 * First failure retries on the normal interval. Further failures double the wait, up to 24 hours.
 * A Retry-After hint from HTTP 429 overrides that delay when it is longer than one minute.
 */
export function nextDelayMs(input: {
  intervalMinutes: number;
  consecutiveFailures: number;
  retryAfterMs?: number;
}): number {
  const base = input.intervalMinutes * 60_000;
  const hinted = input.retryAfterMs && input.retryAfterMs > 0 ? Math.max(input.retryAfterMs, 60_000) : 0;
  if (input.consecutiveFailures <= 0) return Math.max(base, hinted);
  const factor = Math.min(2 ** (input.consecutiveFailures - 1), 8);
  const backedOff = Math.min(base * factor, 24 * 60 * 60_000);
  return Math.max(backedOff, hinted);
}
