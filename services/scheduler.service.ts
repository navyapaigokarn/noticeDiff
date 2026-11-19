import { browser } from 'wxt/browser';
import { brand } from '@/config/brand';
import { SCHEDULER_TICK_MINUTES } from '@/config/monitoring';
import { createChromeMonitorDependencies } from '@/services/chrome-runtime';
import { processDueMonitors } from '@/services/website-monitor.service';

export async function ensureScheduler(): Promise<void> {
  await browser.alarms.create(brand.alarmName, {
    periodInMinutes: SCHEDULER_TICK_MINUTES,
    delayInMinutes: 1,
  });
}

export function registerScheduler(deps = createChromeMonitorDependencies()): void {
  browser.runtime.onInstalled.addListener(() => {
    void ensureScheduler();
  });
  browser.runtime.onStartup.addListener(() => {
    void ensureScheduler();
    void processDueMonitors(deps);
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== brand.alarmName) return;
    void processDueMonitors(deps);
  });
}
