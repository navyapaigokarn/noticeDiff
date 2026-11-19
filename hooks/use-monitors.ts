import { useLiveQuery } from 'dexie-react-hooks';
import { changeRepository } from '@/database/change.repository';
import { monitorRepository } from '@/database/monitor.repository';
import { snapshotRepository } from '@/database/snapshot.repository';
import { buildMonitorStats } from '@/utils/monitor-stats';

export function useMonitoringData() {
  const monitors = useLiveQuery(() => monitorRepository.list(), []);
  const recentChanges = useLiveQuery(() => changeRepository.listRecent(50), []);
  const changeCount = useLiveQuery(() => changeRepository.count(), []);
  const unreadCount = useLiveQuery(() => changeRepository.countUnread(), []);
  const unreadMonitorIds = useLiveQuery(() => changeRepository.unreadMonitorIds(), []);
  const loading = monitors === undefined || recentChanges === undefined || changeCount === undefined || unreadCount === undefined || unreadMonitorIds === undefined;
  const stats = buildMonitorStats({
    monitors: monitors ?? [],
    changeCount: changeCount ?? 0,
    unreadCount: unreadCount ?? 0,
    unreadMonitorIds: unreadMonitorIds ?? [],
  });
  return {
    monitors: monitors ?? [],
    recentChanges: recentChanges ?? [],
    unreadMonitorIds: new Set(unreadMonitorIds ?? []),
    stats,
    loading,
  };
}

export function useWebsiteHistory(monitorId: string | undefined) {
  const monitor = useLiveQuery(() => (monitorId ? monitorRepository.getById(monitorId) : null), [monitorId]);
  const snapshots = useLiveQuery(() => (monitorId ? snapshotRepository.listByMonitor(monitorId) : []), [monitorId]);
  const changes = useLiveQuery(() => (monitorId ? changeRepository.listByMonitor(monitorId) : []), [monitorId]);
  return {
    monitor,
    snapshots: snapshots ?? [],
    changes: changes ?? [],
    loading: monitor === undefined || snapshots === undefined || changes === undefined,
  };
}

export function useChangeDetail(changeId: string | undefined) {
  const change = useLiveQuery(() => (changeId ? changeRepository.getById(changeId) : null), [changeId]);
  const monitor = useLiveQuery(() => (change ? monitorRepository.getById(change.monitorId) : null), [change?.monitorId]);
  const previous = useLiveQuery(
    () => (change ? snapshotRepository.getById(change.previousSnapshotId) : null),
    [change?.previousSnapshotId],
  );
  const current = useLiveQuery(
    () => (change ? snapshotRepository.getById(change.currentSnapshotId) : null),
    [change?.currentSnapshotId],
  );
  return { change, monitor, previous, current, loading: change === undefined };
}
