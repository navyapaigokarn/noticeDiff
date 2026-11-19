import { isMonitorInterval } from '@/config/monitoring';
import { changeRepository } from '@/database/change.repository';
import { clearAllMonitoringData, pruneAllHistory } from '@/database/retention';
import type { ExtensionRequest, ExtensionResponse } from '@/types/message.types';
import { MonitorError, toUserMessage } from '@/utils/errors';
import type { MonitorDependencies } from '@/services/monitor-dependencies';
import { getSettings } from '@/services/settings.service';
import {
  addMonitor,
  checkMonitor,
  pauseMonitor,
  removeMonitor,
  resumeMonitor,
  updateMonitorInterval,
} from '@/services/website-monitor.service';

export async function handleExtensionMessage(
  message: unknown,
  deps: MonitorDependencies,
): Promise<ExtensionResponse> {
  try {
    const request = parseRequest(message);
    switch (request.type) {
      case 'ADD_MONITOR': {
        const monitor = await addMonitor(
          {
            url: request.url,
            ...(request.title ? { title: request.title } : {}),
            ...(request.intervalMinutes !== undefined ? { intervalMinutes: request.intervalMinutes } : {}),
          },
          deps,
        );
        return { ok: true, monitor };
      }
      case 'CHECK_MONITOR':
        return { ok: true, check: await checkMonitor(request.monitorId, { manual: true }, deps) };
      case 'PAUSE_MONITOR':
        await pauseMonitor(request.monitorId, deps);
        return { ok: true };
      case 'RESUME_MONITOR':
        await resumeMonitor(request.monitorId, deps);
        return { ok: true };
      case 'DELETE_MONITOR':
        await removeMonitor(request.monitorId);
        return { ok: true };
      case 'UPDATE_INTERVAL':
        await updateMonitorInterval(request.monitorId, request.intervalMinutes, deps);
        return { ok: true };
      case 'MARK_CHANGE_READ':
        await changeRepository.markRead(request.changeId);
        return { ok: true };
      case 'MARK_ALL_CHANGES_READ':
        await changeRepository.markAllRead();
        return { ok: true };
      case 'PRUNE_HISTORY':
        await pruneAllHistory((await getSettings()).maxSnapshotsPerMonitor);
        return { ok: true };
      case 'CLEAR_ALL_DATA':
        await clearAllMonitoringData();
        return { ok: true };
      default:
        return { ok: false, error: 'That action is not supported.', code: 'INTERNAL' };
    }
  } catch (error) {
    return {
      ok: false,
      error: toUserMessage(error),
      code: error instanceof MonitorError ? error.code : 'INTERNAL',
    };
  }
}

function parseRequest(message: unknown): ExtensionRequest {
  if (!message || typeof message !== 'object' || !('type' in message)) {
    throw new MonitorError('The request was not understood.', 'INTERNAL');
  }
  const request = message as ExtensionRequest;
  switch (request.type) {
    case 'ADD_MONITOR':
      if (typeof request.url !== 'string') throw new MonitorError('Enter a website address.', 'INVALID_URL');
      return request;
    case 'CHECK_MONITOR':
    case 'PAUSE_MONITOR':
    case 'RESUME_MONITOR':
    case 'DELETE_MONITOR':
      if (typeof request.monitorId !== 'string') throw new MonitorError('Choose a website first.', 'NOT_FOUND');
      return request;
    case 'UPDATE_INTERVAL':
      if (typeof request.monitorId !== 'string' || !isMonitorInterval(request.intervalMinutes)) {
        throw new MonitorError('Choose a supported monitoring frequency.', 'INTERNAL');
      }
      return request;
    case 'MARK_CHANGE_READ':
      if (typeof request.changeId !== 'string') throw new MonitorError('That change could not be found.', 'NOT_FOUND');
      return request;
    case 'MARK_ALL_CHANGES_READ':
    case 'PRUNE_HISTORY':
    case 'CLEAR_ALL_DATA':
      return request;
    default:
      throw new MonitorError('That action is not supported.', 'INTERNAL');
  }
}
