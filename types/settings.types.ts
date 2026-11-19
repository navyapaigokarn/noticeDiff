import type { MonitorInterval } from '@/config/monitoring';

export interface AppSettings {
  defaultIntervalMinutes: MonitorInterval;
  notificationsEnabled: boolean;
  maxSnapshotsPerMonitor: number;
}
