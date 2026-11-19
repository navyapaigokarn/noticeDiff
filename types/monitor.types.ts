import type { MonitorInterval } from '@/config/monitoring';

export type MonitorStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface MonitoredWebsite {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  hostname: string;
  faviconUrl?: string;
  status: MonitorStatus;
  intervalMinutes: MonitorInterval;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
  lastChangeAt?: number;
  nextCheckAt?: number;
  lastHash?: string;
  lastError?: string | null;
  consecutiveFailures: number;
  checkInProgressAt?: number | null;
}

export interface AddMonitorInput {
  url: string;
  title?: string;
  intervalMinutes?: number;
}
