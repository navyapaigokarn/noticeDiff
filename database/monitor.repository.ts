import { getDatabase } from '@/database/database';
import type { MonitoredWebsite } from '@/types/monitor.types';

export type MonitorUpdate = Partial<Omit<MonitoredWebsite, 'id' | 'createdAt'>>;

export const monitorRepository = {
  async list(): Promise<MonitoredWebsite[]> {
    const rows = await getDatabase().monitors.toArray();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<MonitoredWebsite | null> {
    return (await getDatabase().monitors.get(id)) ?? null;
  },

  async findByNormalizedUrl(normalizedUrl: string): Promise<MonitoredWebsite | null> {
    return (await getDatabase().monitors.where('normalizedUrl').equals(normalizedUrl).first()) ?? null;
  },

  async add(monitor: MonitoredWebsite): Promise<void> {
    await getDatabase().monitors.add(monitor);
  },

  async update(id: string, patch: MonitorUpdate): Promise<void> {
    await getDatabase().monitors.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    await getDatabase().monitors.delete(id);
  },

  async listActive(): Promise<MonitoredWebsite[]> {
    return getDatabase().monitors.where('status').equals('ACTIVE').toArray();
  },
};
