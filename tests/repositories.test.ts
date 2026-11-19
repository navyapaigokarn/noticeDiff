import { beforeEach, describe, expect, it } from 'vitest';
import { changeRepository } from '@/database/change.repository';
import { monitorRepository } from '@/database/monitor.repository';
import { deleteMonitorCascade } from '@/database/retention';
import { snapshotRepository } from '@/database/snapshot.repository';
import type { ChangeEvent } from '@/types/change.types';
import type { MonitoredWebsite } from '@/types/monitor.types';
import type { WebsiteSnapshot } from '@/types/snapshot.types';
import { resetTestState } from './helpers';

const monitor: MonitoredWebsite = {
  id: 'site-1',
  url: 'https://example.com/jobs',
  normalizedUrl: 'https://example.com/jobs',
  title: 'Jobs',
  hostname: 'example.com',
  status: 'ACTIVE',
  intervalMinutes: 60,
  createdAt: 1,
  updatedAt: 1,
  lastHash: 'abc',
  consecutiveFailures: 0,
};

function snapshot(id: string, text: string): WebsiteSnapshot {
  return {
    id,
    monitorId: monitor.id,
    contentHash: id,
    extractedText: text,
    title: 'Jobs',
    fetchedAt: Number(id.replace('snap-', '')),
    truncated: false,
  };
}

describe('repositories', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it('saves a website, a baseline, and a change, then deletes them together', async () => {
    await monitorRepository.add(monitor);
    await snapshotRepository.add(snapshot('snap-1', 'Vacancies: 100'));
    await snapshotRepository.add(snapshot('snap-2', 'Vacancies: 150'));
    const change: ChangeEvent = {
      id: 'change-1',
      monitorId: monitor.id,
      previousSnapshotId: 'snap-1',
      currentSnapshotId: 'snap-2',
      detectedAt: 2,
      addedText: [],
      removedText: [],
      modified: [{ label: 'Vacancies', previous: '100', next: '150' }],
      changeSummary: 'Vacancies changed from 100 to 150',
      isRead: false,
    };
    await changeRepository.add(change);

    expect(await monitorRepository.findByNormalizedUrl(monitor.normalizedUrl)).toMatchObject({ id: monitor.id });
    expect(await snapshotRepository.countByMonitor(monitor.id)).toBe(2);
    expect(await changeRepository.countUnread()).toBe(1);

    await deleteMonitorCascade(monitor.id);
    expect(await monitorRepository.getById(monitor.id)).toBeNull();
    expect(await snapshotRepository.countByMonitor(monitor.id)).toBe(0);
    expect(await changeRepository.listByMonitor(monitor.id)).toHaveLength(0);
  });
});
