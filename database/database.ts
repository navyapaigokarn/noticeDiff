import Dexie, { type EntityTable } from 'dexie';
import { brand } from '@/config/brand';
import type { ChangeEvent } from '@/types/change.types';
import type { MonitoredWebsite } from '@/types/monitor.types';
import type { WebsiteSnapshot } from '@/types/snapshot.types';

export class NoticeDiffDatabase extends Dexie {
  monitors!: EntityTable<MonitoredWebsite, 'id'>;
  snapshots!: EntityTable<WebsiteSnapshot, 'id'>;
  changes!: EntityTable<ChangeEvent, 'id'>;

  constructor(name = brand.databaseName) {
    super(name);
    this.version(1).stores({
      monitors: 'id, &normalizedUrl, status, hostname, nextCheckAt, createdAt',
      snapshots: 'id, monitorId, fetchedAt, contentHash, [monitorId+fetchedAt]',
      changes: 'id, monitorId, detectedAt, isRead, [monitorId+detectedAt]',
    });
  }
}

let database: NoticeDiffDatabase | null = null;

export function getDatabase(): NoticeDiffDatabase {
  if (!database) database = new NoticeDiffDatabase();
  return database;
}

export async function resetDatabase(): Promise<void> {
  if (database) {
    database.close();
    await database.delete();
    database = null;
  }
}
