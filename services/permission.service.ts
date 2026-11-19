import { browser } from 'wxt/browser';
import { MonitorError } from '@/utils/errors';
import { hostPermissionPattern, validatePublicUrl } from '@/utils/url-validator';

export async function ensureHostPermission(url: string): Promise<void> {
  const pattern = hostPermissionPattern(validatePublicUrl(url).normalizedUrl);
  const existing = await browser.permissions.contains({ origins: [pattern] });
  if (existing) return;
  const granted = await browser.permissions.request({ origins: [pattern] });
  if (!granted) {
    throw new MonitorError(
      'Permission is required to monitor this website. NoticeDiff only asks for the sites you add.',
      'PERMISSION_DENIED',
    );
  }
}

export interface TabInspection {
  href: string;
  title: string;
  contentType: string;
}

export async function inspectTab(tabId: number): Promise<TabInspection | null> {
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => ({
        href: location.href,
        title: document.title,
        contentType: document.contentType,
      }),
    });
    const value = result?.result;
    if (!value || typeof value.href !== 'string') return null;
    return {
      href: value.href,
      title: typeof value.title === 'string' ? value.title : '',
      contentType: typeof value.contentType === 'string' ? value.contentType : '',
    };
  } catch {
    return null;
  }
}
