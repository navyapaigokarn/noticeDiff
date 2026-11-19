import type { AppSettings } from '@/types/settings.types';
import type { FetchedDocument } from '@/services/webpage-fetch.service';

export interface ChangeNotification {
  changeId: string;
  title: string;
  summary: string;
}

export interface MonitorDependencies {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  hostGapMs: number;
  getSettings: () => Promise<AppSettings>;
  hasPermission: (url: string) => Promise<boolean>;
  fetchPage: (url: string) => Promise<FetchedDocument>;
  notifyChange: (input: ChangeNotification) => Promise<void>;
}
