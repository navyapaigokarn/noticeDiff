import { getDatabase } from '@/database/database';
import { changeRepository } from '@/database/change.repository';
import { monitorRepository } from '@/database/monitor.repository';
import { snapshotRepository } from '@/database/snapshot.repository';

export async function deleteMonitorCascade(monitorId: string): Promise<void> {
  const db = getDatabase();
  await db.transaction('rw', db.monitors, db.snapshots, db.changes, async () => {
    await changeRepository.removeByMonitor(monitorId);
    await snapshotRepository.removeByMonitor(monitorId);
    await monitorRepository.remove(monitorId);
  });
}

export async function clearAllMonitoringData(): Promise<void> {
  const db = getDatabase();
  await db.transaction('rw', db.monitors, db.snapshots, db.changes, async () => {
    await db.changes.clear();
    await db.snapshots.clear();
    await db.monitors.clear();
  });
}

export async function pruneMonitorHistory(monitorId: string, maxSnapshots: number): Promise<void> {
  const db = getDatabase();
  await db.transaction('rw', db.snapshots, db.changes, async () => {
    const changes = await changeRepository.listByMonitor(monitorId);
    if (changes.length > maxSnapshots) {
      const extraChanges = changes.slice(maxSnapshots);
      await db.changes.bulkDelete(extraChanges.map((change) => change.id));
    }

    const remainingChanges = await changeRepository.listByMonitor(monitorId);
    const referenced = new Set(
      remainingChanges.flatMap((change) => [change.previousSnapshotId, change.currentSnapshotId]),
    );
    const snapshots = await snapshotRepository.listByMonitor(monitorId);
    const stale = snapshots.filter((snapshot, index) => index >= maxSnapshots && !referenced.has(snapshot.id));
    if (stale.length > 0) {
      await db.snapshots.bulkDelete(stale.map((snapshot) => snapshot.id));
    }
  });
}

export async function pruneAllHistory(maxSnapshots: number): Promise<void> {
  const monitors = await monitorRepository.list();
  for (const monitor of monitors) {
    await pruneMonitorHistory(monitor.id, maxSnapshots);
  }
}
