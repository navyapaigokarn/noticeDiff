import { getDatabase } from '@/database/database';
import type { WebsiteSnapshot } from '@/types/snapshot.types';

export const snapshotRepository = {
  async add(snapshot: WebsiteSnapshot): Promise<void> {
    await getDatabase().snapshots.add(snapshot);
  },

  async getById(id: string): Promise<WebsiteSnapshot | null> {
    return (await getDatabase().snapshots.get(id)) ?? null;
  },

  async listByMonitor(monitorId: string): Promise<WebsiteSnapshot[]> {
    const rows = await getDatabase().snapshots.where('monitorId').equals(monitorId).toArray();
    return rows.sort((a, b) => b.fetchedAt - a.fetchedAt);
  },

  async countByMonitor(monitorId: string): Promise<number> {
    return getDatabase().snapshots.where('monitorId').equals(monitorId).count();
  },

  async removeByMonitor(monitorId: string): Promise<void> {
    await getDatabase().snapshots.where('monitorId').equals(monitorId).delete();
  },
};
