import { browser } from 'wxt/browser';
import type { ExtensionRequest, ExtensionResponse } from '@/types/message.types';
import { MONITOR_ERROR_CODES, MonitorError, type MonitorErrorCode } from '@/utils/errors';

export async function sendExtensionMessage(message: ExtensionRequest): Promise<ExtensionResponse & { ok: true }> {
  let response: ExtensionResponse | undefined;
  try {
    response = await browser.runtime.sendMessage(message);
  } catch {
    throw new MonitorError('NoticeDiff could not reach its background worker. Try again in a moment.', 'WORKER');
  }
  if (!response?.ok) {
    throw new MonitorError(response?.error || 'The request failed.', asErrorCode(response?.code));
  }
  return response;
}

function asErrorCode(code: string | undefined): MonitorErrorCode {
  if (code && (MONITOR_ERROR_CODES as readonly string[]).includes(code)) return code as MonitorErrorCode;
  return 'INTERNAL';
}
