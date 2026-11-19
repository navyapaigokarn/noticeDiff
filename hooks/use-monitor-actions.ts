import { useState } from 'react';
import { describeCheck } from '@/utils/check-message';
import { toUserMessage } from '@/utils/errors';
import { sendExtensionMessage } from '@/services/extension-client';

interface Notice {
  tone: 'success' | 'error';
  text: string;
}

export function useMonitorActions() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function run(id: string, action: () => Promise<string | void>): Promise<void> {
    setPendingId(id);
    setNotice(null);
    try {
      const text = await action();
      if (text) setNotice({ tone: 'success', text });
    } catch (error) {
      setNotice({ tone: 'error', text: toUserMessage(error) });
    } finally {
      setPendingId(null);
    }
  }

  return {
    pendingId,
    notice,
    clearNotice: () => setNotice(null),
    checkNow(id: string) {
      return run(id, async () => {
        const response = await sendExtensionMessage({ type: 'CHECK_MONITOR', monitorId: id });
        return response.check ? describeCheck(response.check) : 'Check finished.';
      });
    },
    pause(id: string) {
      return run(id, async () => {
        await sendExtensionMessage({ type: 'PAUSE_MONITOR', monitorId: id });
        return 'Monitoring paused.';
      });
    },
    resume(id: string) {
      return run(id, async () => {
        await sendExtensionMessage({ type: 'RESUME_MONITOR', monitorId: id });
        return 'Monitoring resumed.';
      });
    },
    remove(id: string) {
      return run(id, async () => {
        await sendExtensionMessage({ type: 'DELETE_MONITOR', monitorId: id });
        return 'Website and its history were deleted.';
      });
    },
    updateInterval(id: string, intervalMinutes: number) {
      return run(id, async () => {
        await sendExtensionMessage({ type: 'UPDATE_INTERVAL', monitorId: id, intervalMinutes });
      });
    },
  };
}
