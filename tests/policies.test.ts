import { describe, expect, it } from 'vitest';
import { brand } from '@/config/brand';
import { changeNotificationCopy, shouldSendChangeNotification } from '@/services/notification-policy';
import { isMonitorDue, nextDelayMs } from '@/services/schedule-policy';
import { parseRetryAfter } from '@/services/webpage-fetch.service';

describe('notification policy', () => {
  it('notifies only for a real change when notifications are enabled', () => {
    expect(
      shouldSendChangeNotification({
        notificationsEnabled: true,
        isInitialBaseline: false,
        contentChanged: true,
        fetchFailed: false,
      }),
    ).toBe(true);
  });

  it('stays quiet for the baseline, identical content, and failed fetches', () => {
    expect(shouldSendChangeNotification({ notificationsEnabled: true, isInitialBaseline: true, contentChanged: false, fetchFailed: false })).toBe(false);
    expect(shouldSendChangeNotification({ notificationsEnabled: true, isInitialBaseline: false, contentChanged: false, fetchFailed: false })).toBe(false);
    expect(shouldSendChangeNotification({ notificationsEnabled: true, isInitialBaseline: false, contentChanged: false, fetchFailed: true })).toBe(false);
    expect(shouldSendChangeNotification({ notificationsEnabled: false, isInitialBaseline: false, contentChanged: true, fetchFailed: false })).toBe(false);
  });

  it('builds a local notification that names the product and page', () => {
    const copy = changeNotificationCopy('Recruitment Notifications', 'Vacancies changed from 100 to 150');
    expect(copy.title).toBe(`${brand.name} detected a change`);
    expect(copy.message).toContain('Recruitment Notifications has new content.');
  });
});

describe('schedule policy', () => {
  it('checks active websites only when they are due', () => {
    expect(isMonitorDue({ status: 'ACTIVE', nextCheckAt: 100 }, 100)).toBe(true);
    expect(isMonitorDue({ status: 'ACTIVE', nextCheckAt: 200 }, 100)).toBe(false);
    expect(isMonitorDue({ status: 'PAUSED', nextCheckAt: 0 }, 100)).toBe(false);
  });

  it('backs off repeated failures and honours retry-after', () => {
    expect(nextDelayMs({ intervalMinutes: 60, consecutiveFailures: 1 })).toBe(60 * 60_000);
    expect(nextDelayMs({ intervalMinutes: 60, consecutiveFailures: 2 })).toBe(2 * 60 * 60_000);
    expect(nextDelayMs({ intervalMinutes: 60, consecutiveFailures: 1, retryAfterMs: 10 * 60_000 })).toBe(60 * 60_000);
    expect(nextDelayMs({ intervalMinutes: 60, consecutiveFailures: 1, retryAfterMs: 3 * 60 * 60_000 })).toBe(3 * 60 * 60_000);
    expect(parseRetryAfter('120')).toBe(120_000);
  });
});
