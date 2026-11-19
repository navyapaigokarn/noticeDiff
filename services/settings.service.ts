import {
  DEFAULT_INTERVAL_MINUTES,
  DEFAULT_SNAPSHOT_RETENTION,
  MAX_SNAPSHOT_RETENTION,
  MIN_SNAPSHOT_RETENTION,
  isMonitorInterval,
  type MonitorInterval,
} from '@/config/monitoring';
import type { AppSettings } from '@/types/settings.types';

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultIntervalMinutes: DEFAULT_INTERVAL_MINUTES,
  notificationsEnabled: true,
  maxSnapshotsPerMonitor: DEFAULT_SNAPSHOT_RETENTION,
};

type StorageArea = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

let memorySettings: AppSettings | null = null;

export async function getSettings(): Promise<AppSettings> {
  const area = storageArea();
  if (!area) return sanitizeSettings(memorySettings ?? undefined);
  const stored = await area.get(SETTINGS_KEY);
  return sanitizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  const area = storageArea();
  if (!area) {
    memorySettings = next;
    return next;
  }
  await area.set({ [SETTINGS_KEY]: next });
  return next;
}

export function sanitizeSettings(value: unknown): AppSettings {
  const record = value && typeof value === 'object' ? (value as Partial<AppSettings>) : {};
  const interval = typeof record.defaultIntervalMinutes === 'number' ? record.defaultIntervalMinutes : DEFAULT_INTERVAL_MINUTES;
  const retention =
    typeof record.maxSnapshotsPerMonitor === 'number' && Number.isFinite(record.maxSnapshotsPerMonitor)
      ? record.maxSnapshotsPerMonitor
      : DEFAULT_SNAPSHOT_RETENTION;
  return {
    defaultIntervalMinutes: isMonitorInterval(interval) ? interval : DEFAULT_INTERVAL_MINUTES,
    notificationsEnabled: record.notificationsEnabled !== false,
    maxSnapshotsPerMonitor: clamp(Math.round(retention), MIN_SNAPSHOT_RETENTION, MAX_SNAPSHOT_RETENTION),
  };
}

export function resolveInterval(value: number | undefined, fallback: MonitorInterval): MonitorInterval {
  if (value !== undefined && isMonitorInterval(value)) return value;
  return fallback;
}

function storageArea(): StorageArea | null {
  const root = globalThis as {
    chrome?: { storage?: { local?: StorageArea } };
    browser?: { storage?: { local?: StorageArea } };
  };
  return root.chrome?.storage?.local ?? root.browser?.storage?.local ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
