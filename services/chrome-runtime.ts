import { browser } from 'wxt/browser';
import { HOST_REQUEST_GAP_MS } from '@/config/monitoring';
import type { MonitorDependencies } from '@/services/monitor-dependencies';
import { changeNotificationCopy } from '@/services/notification-policy';
import { getSettings } from '@/services/settings.service';
import { fetchPublicHtml } from '@/services/webpage-fetch.service';
import { sleep } from '@/utils/async';
import { hostPermissionPattern } from '@/utils/url-validator';

async function hasPermission(url: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [hostPermissionPattern(url)] });
}

export function createChromeMonitorDependencies(): MonitorDependencies {
  return {
    now: () => Date.now(),
    sleep,
    hostGapMs: HOST_REQUEST_GAP_MS,
    getSettings,
    hasPermission,
    fetchPage: (url) => fetchPublicHtml(url, { hasPermission }),
    notifyChange: async ({ changeId, title, summary }) => {
      const copy = changeNotificationCopy(title, summary);
      await browser.notifications.create(`change:${changeId}`, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icon-128.png'),
        title: copy.title,
        message: copy.message,
        priority: 1,
      });
    },
  };
}

export async function openChangeFromNotification(notificationId: string): Promise<void> {
  if (!notificationId.startsWith('change:')) return;
  const changeId = notificationId.slice('change:'.length);
  const url = `${browser.runtime.getURL('/dashboard.html')}#/changes/${encodeURIComponent(changeId)}`;
  await browser.tabs.create({ url });
  await browser.notifications.clear(notificationId);
}
