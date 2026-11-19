import { brand } from '@/config/brand';
import type { AppSettings } from '@/types/settings.types';

export function shouldSendChangeNotification(input: {
  notificationsEnabled: boolean;
  isInitialBaseline: boolean;
  contentChanged: boolean;
  fetchFailed: boolean;
}): boolean {
  return input.notificationsEnabled && input.contentChanged && !input.isInitialBaseline && !input.fetchFailed;
}

export function changeNotificationCopy(title: string, summary: string): { title: string; message: string } {
  const lead = `${title} has new content.`;
  const detail = summary && summary !== 'No meaningful change' ? ` ${summary}` : '';
  const message = `${lead}${detail}`.slice(0, 180);
  return { title: `${brand.name} detected a change`, message };
}

export function notificationsAllowed(settings: AppSettings): boolean {
  return settings.notificationsEnabled;
}
