import { MAX_CONCURRENT_CHECKS } from '@/config/monitoring';
import { changeRepository } from '@/database/change.repository';
import { getDatabase } from '@/database/database';
import { monitorRepository } from '@/database/monitor.repository';
import { pruneMonitorHistory, deleteMonitorCascade } from '@/database/retention';
import { snapshotRepository } from '@/database/snapshot.repository';
import type { CheckResult } from '@/types/check.types';
import type { ChangeEvent } from '@/types/change.types';
import type { AddMonitorInput, MonitoredWebsite } from '@/types/monitor.types';
import type { WebsiteSnapshot } from '@/types/snapshot.types';
import { runWithConcurrency } from '@/utils/async';
import { sha256 } from '@/utils/content-hash';
import { MonitorError, toUserMessage } from '@/utils/errors';
import { createId } from '@/utils/id';
import { logger } from '@/utils/logger';
import { validatePublicUrl } from '@/utils/url-validator';
import { assertMeaningfulContent, extractFromHtml, looksLikeAccessChallenge, type ExtractedPage } from '@/services/content-extractor.service';
import { compareContent, limitStoredLines } from '@/services/diff.service';
import type { MonitorDependencies } from '@/services/monitor-dependencies';
import { isCheckLocked, isMonitorDue, nextDelayMs } from '@/services/schedule-policy';
import { resolveInterval } from '@/services/settings.service';
import { shouldSendChangeNotification } from '@/services/notification-policy';

const inFlight = new Set<string>();
const hostReadyAt = new Map<string, number>();
const hostQueue = new Map<string, Promise<void>>();

export function resetMonitorRuntimeForTests(): void {
  inFlight.clear();
  hostReadyAt.clear();
  hostQueue.clear();
}

export async function addMonitor(input: AddMonitorInput, deps: MonitorDependencies): Promise<MonitoredWebsite> {
  const validated = validatePublicUrl(input.url);
  const existing = await monitorRepository.findByNormalizedUrl(validated.normalizedUrl);
  if (existing) {
    throw new MonitorError('This website is already being monitored.', 'DUPLICATE');
  }
  await assertPermission(validated.requestUrl, deps);

  const settings = await deps.getSettings();
  const intervalMinutes = resolveInterval(input.intervalMinutes, settings.defaultIntervalMinutes);
  const extracted = await fetchAndExtract(validated.requestUrl, deps);
  const now = deps.now();
  const hash = await sha256(extracted.text);
  const monitor: MonitoredWebsite = {
    id: createId(),
    url: validated.requestUrl,
    normalizedUrl: validated.normalizedUrl,
    title: chooseTitle(extracted.title, input.title, validated.hostname),
    hostname: validated.hostname,
    ...(extracted.faviconUrl ? { faviconUrl: extracted.faviconUrl } : {}),
    status: 'ACTIVE',
    intervalMinutes,
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: now,
    nextCheckAt: now + intervalMinutes * 60_000,
    lastHash: hash,
    lastError: null,
    consecutiveFailures: 0,
    checkInProgressAt: null,
  };
  const snapshot = createSnapshot(monitor.id, extracted, hash, now);
  const db = getDatabase();

  try {
    await db.transaction('rw', db.monitors, db.snapshots, async () => {
      const duplicate = await monitorRepository.findByNormalizedUrl(validated.normalizedUrl);
      if (duplicate) throw new MonitorError('This website is already being monitored.', 'DUPLICATE');
      await monitorRepository.add(monitor);
      await snapshotRepository.add(snapshot);
    });
  } catch (error) {
    if (error instanceof MonitorError) throw error;
    if (error instanceof Error && error.name === 'ConstraintError') {
      throw new MonitorError('This website is already being monitored.', 'DUPLICATE');
    }
    logger.error('Failed to save a monitor', { code: 'INTERNAL' });
    throw new MonitorError('NoticeDiff could not save this website on this device.', 'INTERNAL');
  }

  return monitor;
}

export async function checkMonitor(
  monitorId: string,
  options: { manual?: boolean },
  deps: MonitorDependencies,
): Promise<CheckResult> {
  if (inFlight.has(monitorId)) {
    return { status: 'skipped', reason: 'This website is already being checked.' };
  }
  inFlight.add(monitorId);
  try {
    const monitor = await monitorRepository.getById(monitorId);
    if (!monitor) throw new MonitorError('That monitored website could not be found.', 'NOT_FOUND');
    if (monitor.status === 'PAUSED' && !options.manual) {
      return { status: 'skipped', reason: 'Monitoring is paused for this website.' };
    }
    const startedAt = deps.now();
    if (!options.manual && isCheckLocked(monitor.checkInProgressAt, startedAt)) {
      return { status: 'skipped', reason: 'This website is already being checked.' };
    }
    await monitorRepository.update(monitorId, { checkInProgressAt: startedAt, updatedAt: startedAt });

    let extracted: ExtractedPage;
    try {
      await assertPermission(monitor.url, deps);
      extracted = await fetchAndExtract(monitor.url, deps);
    } catch (error) {
      const failure = error instanceof MonitorError ? error : new MonitorError(toUserMessage(error), 'NETWORK');
      await recordFailure(monitor, failure, deps);
      return { status: 'failed', message: failure.message };
    }

    const checkedAt = deps.now();
    const hash = await sha256(extracted.text);
    const previous = (await snapshotRepository.listByMonitor(monitorId))[0] ?? null;
    const unchangedPatch = {
      status: monitor.status === 'PAUSED' ? ('PAUSED' as const) : ('ACTIVE' as const),
      title: chooseTitle(extracted.title, monitor.title, monitor.hostname),
      ...(extracted.faviconUrl ? { faviconUrl: extracted.faviconUrl } : {}),
      lastHash: hash,
      lastCheckedAt: checkedAt,
      lastError: null,
      consecutiveFailures: 0,
      checkInProgressAt: null,
      nextCheckAt: checkedAt + monitor.intervalMinutes * 60_000,
      updatedAt: checkedAt,
    };

    if (!previous) {
      const snapshot = createSnapshot(monitorId, extracted, hash, checkedAt);
      await snapshotRepository.add(snapshot);
      await monitorRepository.update(monitorId, unchangedPatch);
      return { status: 'baseline' };
    }

    if (previous.contentHash === hash || monitor.lastHash === hash) {
      await monitorRepository.update(monitorId, unchangedPatch);
      return { status: 'unchanged' };
    }

    const diff = compareContent(previous.extractedText, extracted.text);
    if (diff.identical) {
      await monitorRepository.update(monitorId, unchangedPatch);
      return { status: 'unchanged' };
    }

    const settings = await deps.getSettings();
    const current = createSnapshot(monitorId, extracted, hash, checkedAt);
    const change: ChangeEvent = {
      id: createId(),
      monitorId,
      previousSnapshotId: previous.id,
      currentSnapshotId: current.id,
      detectedAt: checkedAt,
      addedText: limitStoredLines(diff.added),
      removedText: limitStoredLines(diff.removed),
      modified: diff.modified.slice(0, 20),
      changeSummary: diff.summary,
      isRead: false,
    };
    const db = getDatabase();
    await db.transaction('rw', db.monitors, db.snapshots, db.changes, async () => {
      await snapshotRepository.add(current);
      await changeRepository.add(change);
      await monitorRepository.update(monitorId, { ...unchangedPatch, lastChangeAt: checkedAt });
    });
    await pruneMonitorHistory(monitorId, settings.maxSnapshotsPerMonitor);

    if (
      shouldSendChangeNotification({
        notificationsEnabled: settings.notificationsEnabled,
        isInitialBaseline: false,
        contentChanged: true,
        fetchFailed: false,
      })
    ) {
      try {
        await deps.notifyChange({
          changeId: change.id,
          title: unchangedPatch.title,
          summary: diff.summary,
        });
      } catch {
        logger.warn('Could not show a change notification', { monitorId });
      }
    }

    return { status: 'changed', changeId: change.id, summary: diff.summary };
  } finally {
    inFlight.delete(monitorId);
  }
}

export async function processDueMonitors(deps: MonitorDependencies): Promise<void> {
  const now = deps.now();
  const due = (await monitorRepository.listActive()).filter(
    (monitor) => isMonitorDue(monitor, now) && !inFlight.has(monitor.id) && !isCheckLocked(monitor.checkInProgressAt, now),
  );
  await runWithConcurrency(due, MAX_CONCURRENT_CHECKS, async (monitor) => {
    try {
      await checkMonitor(monitor.id, { manual: false }, deps);
    } catch (error) {
      logger.error('Scheduled check failed', {
        monitorId: monitor.id,
        code: error instanceof MonitorError ? error.code : 'INTERNAL',
      });
    }
  });
}

export async function pauseMonitor(monitorId: string, deps: MonitorDependencies): Promise<void> {
  await requireMonitor(monitorId);
  await monitorRepository.update(monitorId, {
    status: 'PAUSED',
    checkInProgressAt: null,
    updatedAt: deps.now(),
  });
}

export async function resumeMonitor(monitorId: string, deps: MonitorDependencies): Promise<void> {
  const monitor = await requireMonitor(monitorId);
  const now = deps.now();
  const nextCheckAt = monitor.nextCheckAt && monitor.nextCheckAt > now ? monitor.nextCheckAt : now;
  await monitorRepository.update(monitorId, {
    status: 'ACTIVE',
    nextCheckAt,
    checkInProgressAt: null,
    updatedAt: now,
  });
}

export async function removeMonitor(monitorId: string): Promise<void> {
  await requireMonitor(monitorId);
  await deleteMonitorCascade(monitorId);
}

export async function updateMonitorInterval(
  monitorId: string,
  intervalMinutes: number,
  deps: MonitorDependencies,
): Promise<void> {
  const monitor = await requireMonitor(monitorId);
  const settings = await deps.getSettings();
  const interval = resolveInterval(intervalMinutes, settings.defaultIntervalMinutes);
  const now = deps.now();
  const anchor = monitor.lastCheckedAt ?? now;
  const candidate = anchor + interval * 60_000;
  await monitorRepository.update(monitorId, {
    intervalMinutes: interval,
    nextCheckAt: candidate < now ? now : candidate,
    updatedAt: now,
  });
}

async function fetchAndExtract(url: string, deps: MonitorDependencies): Promise<ExtractedPage> {
  const hostname = validatePublicUrl(url).hostname;
  await throttleHost(hostname, deps);
  let document;
  try {
    document = await deps.fetchPage(url);
  } catch (error) {
    if (error instanceof MonitorError) throw error;
    throw new MonitorError('The website could not be reached. Check your connection and try again.', 'NETWORK');
  }
  validatePublicUrl(document.finalUrl);
  const extracted = extractFromHtml(document.html, document.finalUrl);
  if (looksLikeAccessChallenge(document.html, extracted.text)) {
    throw new MonitorError(
      'The website showed a challenge or CAPTCHA instead of the page. This was not recorded as a content change.',
      'CAPTCHA',
    );
  }
  assertMeaningfulContent(extracted.text);
  return extracted;
}

async function recordFailure(monitor: MonitoredWebsite, error: MonitorError, deps: MonitorDependencies): Promise<void> {
  const now = deps.now();
  const consecutiveFailures = monitor.consecutiveFailures + 1;
  await monitorRepository.update(monitor.id, {
    status: monitor.status === 'PAUSED' ? 'PAUSED' : 'ERROR',
    lastCheckedAt: now,
    lastError: error.message,
    consecutiveFailures,
    nextCheckAt:
      now +
      nextDelayMs({
        intervalMinutes: monitor.intervalMinutes,
        consecutiveFailures,
        ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
      }),
    checkInProgressAt: null,
    updatedAt: now,
  });
  logger.warn('Website check failed', { hostname: monitor.hostname, code: error.code });
}

async function assertPermission(url: string, deps: MonitorDependencies): Promise<void> {
  const allowed = await deps.hasPermission(url);
  if (!allowed) {
    throw new MonitorError(
      'NoticeDiff does not have permission to read this website. Allow access for the site and try again.',
      'PERMISSION_DENIED',
    );
  }
}

async function requireMonitor(monitorId: string): Promise<MonitoredWebsite> {
  const monitor = await monitorRepository.getById(monitorId);
  if (!monitor) throw new MonitorError('That monitored website could not be found.', 'NOT_FOUND');
  return monitor;
}

function createSnapshot(monitorId: string, extracted: ExtractedPage, hash: string, fetchedAt: number): WebsiteSnapshot {
  return {
    id: createId(),
    monitorId,
    contentHash: hash,
    extractedText: extracted.text,
    title: extracted.title,
    fetchedAt,
    truncated: extracted.truncated,
  };
}

function chooseTitle(extracted: string, hinted: string | undefined, hostname: string): string {
  const title = extracted.trim() || hinted?.trim() || hostname;
  return title.slice(0, 180);
}

async function throttleHost(hostname: string, deps: MonitorDependencies): Promise<void> {
  const previous = hostQueue.get(hostname) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  hostQueue.set(hostname, gate);
  await previous.catch(() => undefined);
  try {
    if (deps.hostGapMs <= 0) return;
    const now = deps.now();
    const readyAt = hostReadyAt.get(hostname) ?? now;
    const start = Math.max(now, readyAt);
    hostReadyAt.set(hostname, start + deps.hostGapMs);
    const wait = start - now;
    if (wait > 0) await deps.sleep(wait);
  } finally {
    release();
  }
}
