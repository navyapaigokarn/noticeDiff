import type { MonitoredWebsite } from '@/types/monitor.types';

export interface MonitorStats {
  total: number;
  active: number;
  paused: number;
  errors: number;
  changes: number;
  unread: number;
  attention: number;
  lastCheckedAt?: number;
}

export function buildMonitorStats(input: {
  monitors: MonitoredWebsite[];
  changeCount: number;
  unreadCount: number;
  unreadMonitorIds: string[];
}): MonitorStats {
  const unreadMonitors = new Set(input.unreadMonitorIds);
  const attention = input.monitors.filter((monitor) => monitor.status === 'ERROR' || unreadMonitors.has(monitor.id)).length;
  let lastCheckedAt: number | undefined;
  for (const monitor of input.monitors) {
    if (!monitor.lastCheckedAt) continue;
    lastCheckedAt = lastCheckedAt === undefined ? monitor.lastCheckedAt : Math.max(lastCheckedAt, monitor.lastCheckedAt);
  }
  return {
    total: input.monitors.length,
    active: input.monitors.filter((monitor) => monitor.status === 'ACTIVE').length,
    paused: input.monitors.filter((monitor) => monitor.status === 'PAUSED').length,
    errors: input.monitors.filter((monitor) => monitor.status === 'ERROR').length,
    changes: input.changeCount,
    unread: input.unreadCount,
    attention,
    ...(lastCheckedAt !== undefined ? { lastCheckedAt } : {}),
  };
}
