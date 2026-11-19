import { getDatabase } from '@/database/database';
import type { ChangeEvent } from '@/types/change.types';

export const changeRepository = {
  async add(change: ChangeEvent): Promise<void> {
    await getDatabase().changes.add(change);
  },

  async getById(id: string): Promise<ChangeEvent | null> {
    return (await getDatabase().changes.get(id)) ?? null;
  },

  async listRecent(limit: number): Promise<ChangeEvent[]> {
    return getDatabase().changes.orderBy('detectedAt').reverse().limit(limit).toArray();
  },

  async listByMonitor(monitorId: string): Promise<ChangeEvent[]> {
    const rows = await getDatabase().changes.where('monitorId').equals(monitorId).toArray();
    return rows.sort((a, b) => b.detectedAt - a.detectedAt);
  },

  async count(): Promise<number> {
    return getDatabase().changes.count();
  },

  async countUnread(): Promise<number> {
    return getDatabase().changes.filter((change) => !change.isRead).count();
  },

  async unreadMonitorIds(): Promise<string[]> {
    const unread = await getDatabase().changes.filter((change) => !change.isRead).toArray();
    return [...new Set(unread.map((change) => change.monitorId))];
  },

  async markRead(id: string): Promise<void> {
    await getDatabase().changes.update(id, { isRead: true });
  },

  async markAllRead(): Promise<void> {
    await getDatabase().changes.filter((change) => !change.isRead).modify({ isRead: true });
  },

  async removeByMonitor(monitorId: string): Promise<void> {
    await getDatabase().changes.where('monitorId').equals(monitorId).delete();
  },
};
