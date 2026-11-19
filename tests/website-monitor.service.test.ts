import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changeRepository } from '@/database/change.repository';
import { monitorRepository } from '@/database/monitor.repository';
import { snapshotRepository } from '@/database/snapshot.repository';
import type { ChangeNotification, MonitorDependencies } from '@/services/monitor-dependencies';
import { DEFAULT_SETTINGS } from '@/services/settings.service';
import { addMonitor, checkMonitor, pauseMonitor, processDueMonitors } from '@/services/website-monitor.service';
import { MonitorError } from '@/utils/errors';
import { createTestDependencies, htmlResponse, recruitmentPage, resetTestState } from './helpers';

function harness(overrides: Partial<MonitorDependencies> = {}) {
  const notifyChange = vi.fn(async (_input: ChangeNotification) => undefined);
  const deps = createTestDependencies({ ...overrides, notifyChange });
  return { deps, notifyChange };
}

describe('website monitoring', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it('saves a baseline without a change notification', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(recruitmentPage('100', '20 December 2026'))));
    const { deps, notifyChange } = harness();
    const monitor = await addMonitor({ url: 'https://example.com/jobs/' }, deps);
    expect(monitor.normalizedUrl).toBe('https://example.com/jobs');
    expect(monitor.status).toBe('ACTIVE');
    expect(await snapshotRepository.countByMonitor(monitor.id)).toBe(1);
    expect(await changeRepository.count()).toBe(0);
    expect(notifyChange).not.toHaveBeenCalled();
  });

  it('does not save a baseline when the first request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500, headers: { 'content-type': 'text/html' } })));
    const { deps, notifyChange } = harness();
    await expect(addMonitor({ url: 'https://example.com/jobs' }, deps)).rejects.toBeInstanceOf(MonitorError);
    expect(await monitorRepository.list()).toHaveLength(0);
    expect(notifyChange).not.toHaveBeenCalled();
  });

  it('rejects duplicate and private addresses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(recruitmentPage('100', '20 December 2026'))));
    const { deps } = harness();
    await addMonitor({ url: 'https://example.com/jobs' }, deps);
    await expect(addMonitor({ url: 'https://example.com/jobs/' }, deps)).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(addMonitor({ url: 'http://127.0.0.1/secret' }, deps)).rejects.toMatchObject({ code: 'PRIVATE_NETWORK' });
  });

  it('stays quiet when the page is unchanged, including whitespace-only differences', async () => {
    const pages = [
      recruitmentPage('100', '20 December 2026'),
      recruitmentPage('100', '20 December 2026').replace('Vacancies: 100', 'Vacancies:   100\n\n'),
    ];
    let index = 0;
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(pages[Math.min(index++, pages.length - 1)] ?? pages[0]!)));
    const { deps, notifyChange } = harness();
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    const result = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(result.status).toBe('unchanged');
    expect(await changeRepository.count()).toBe(0);
    expect(notifyChange).not.toHaveBeenCalled();
  });

  it('records a genuine content change and notifies', async () => {
    const pages = [recruitmentPage('100', '20 December 2026'), recruitmentPage('150', '25 December 2026')];
    let index = 0;
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(pages[Math.min(index++, pages.length - 1)] ?? pages[0]!)));
    const { deps, notifyChange } = harness();
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    const result = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(result.status).toBe('changed');
    if (result.status === 'changed') expect(result.summary).toContain('Vacancies');
    expect(await snapshotRepository.countByMonitor(monitor.id)).toBe(2);
    expect(await changeRepository.count()).toBe(1);
    expect(notifyChange).toHaveBeenCalledTimes(1);
  });

  it('does not record a failed check as a content change', async () => {
    const responses = [htmlResponse(recruitmentPage('100', '20 December 2026')), new Response('down', { status: 500, headers: { 'content-type': 'text/html' } })];
    let index = 0;
    vi.stubGlobal('fetch', vi.fn(async () => responses[Math.min(index++, responses.length - 1)] ?? responses[0]!));
    const { deps, notifyChange } = harness();
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    const result = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(result.status).toBe('failed');
    expect(await snapshotRepository.countByMonitor(monitor.id)).toBe(1);
    expect(await changeRepository.count()).toBe(0);
    expect((await monitorRepository.getById(monitor.id))?.status).toBe('ERROR');
    expect(notifyChange).not.toHaveBeenCalled();
  });

  it('does not notify when notifications are disabled', async () => {
    const pages = [recruitmentPage('100', '20 December 2026'), recruitmentPage('150', '25 December 2026')];
    let index = 0;
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(pages[Math.min(index++, pages.length - 1)] ?? pages[0]!)));
    const { deps, notifyChange } = harness({
      getSettings: async () => ({ ...DEFAULT_SETTINGS, notificationsEnabled: false }),
    });
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    const result = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(result.status).toBe('changed');
    expect(notifyChange).not.toHaveBeenCalled();
  });

  it('skips a repeated check while one is already running', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls > 1) await gate;
        return htmlResponse(recruitmentPage('100', '20 December 2026'));
      }),
    );
    const { deps } = harness();
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    const first = checkMonitor(monitor.id, { manual: true }, deps);
    const second = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(second).toMatchObject({ status: 'skipped' });
    release();
    await first;
  });

  it('does not schedule a paused website, but a manual check still runs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(recruitmentPage('100', '20 December 2026'))));
    const { deps } = harness({ now: () => 1_000 });
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    await pauseMonitor(monitor.id, deps);
    await monitorRepository.update(monitor.id, { nextCheckAt: 0 });
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    await processDueMonitors(deps);
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
    const manual = await checkMonitor(monitor.id, { manual: true }, deps);
    expect(manual.status).toBe('unchanged');
    expect((await monitorRepository.getById(monitor.id))?.status).toBe('PAUSED');
  });

  it('checks websites whose next check time has passed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(recruitmentPage('100', '20 December 2026'))));
    const { deps } = harness({ now: () => 5_000 });
    const monitor = await addMonitor({ url: 'https://example.com/jobs' }, deps);
    await monitorRepository.update(monitor.id, { nextCheckAt: 4_000 });
    await processDueMonitors({ ...deps, now: () => 6_000 });
    const updated = await monitorRepository.getById(monitor.id);
    expect(updated?.lastCheckedAt).toBe(6_000);
  });
});
