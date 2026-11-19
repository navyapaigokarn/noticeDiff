import type { CheckResult } from '@/types/check.types';
import type { MonitoredWebsite } from '@/types/monitor.types';

export type ExtensionRequest =
  | { type: 'ADD_MONITOR'; url: string; title?: string; intervalMinutes?: number }
  | { type: 'CHECK_MONITOR'; monitorId: string }
  | { type: 'PAUSE_MONITOR'; monitorId: string }
  | { type: 'RESUME_MONITOR'; monitorId: string }
  | { type: 'DELETE_MONITOR'; monitorId: string }
  | { type: 'UPDATE_INTERVAL'; monitorId: string; intervalMinutes: number }
  | { type: 'MARK_CHANGE_READ'; changeId: string }
  | { type: 'MARK_ALL_CHANGES_READ' }
  | { type: 'PRUNE_HISTORY' }
  | { type: 'CLEAR_ALL_DATA' };

export type ExtensionResponse =
  | { ok: true; monitor?: MonitoredWebsite; check?: CheckResult }
  | { ok: false; error: string; code?: string };
