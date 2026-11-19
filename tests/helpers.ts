import { vi } from 'vitest';
import { resetDatabase } from '@/database/database';
import { DEFAULT_SETTINGS } from '@/services/settings.service';
import type { MonitorDependencies } from '@/services/monitor-dependencies';
import { fetchPublicHtml } from '@/services/webpage-fetch.service';
import { resetMonitorRuntimeForTests } from '@/services/website-monitor.service';

export function recruitmentPage(vacancies: string, deadline: string, title = 'Recruitment Notification'): string {
  return `<!doctype html><html><head><title>${title}</title>
    <style>.secretStyle{color:red}</style>
    <script>const secretScript = "hidden";</script>
    </head><body>
    <nav>Home navigation</nav>
    <main>
      <h1>${title}</h1>
      <p>Post: Software Engineer</p>
      <p>Vacancies: ${vacancies}</p>
      <p>Application Deadline: ${deadline}</p>
      <table><tr><th>Post</th><th>Vacancies</th></tr><tr><td>Analyst</td><td>12</td></tr></table>
      <ul><li>Apply online</li></ul>
    </main>
    </body></html>`;
}

export function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

export function createTestDependencies(overrides: Partial<MonitorDependencies> = {}): MonitorDependencies {
  return {
    now: () => Date.now(),
    sleep: async () => undefined,
    hostGapMs: 0,
    getSettings: async () => ({ ...DEFAULT_SETTINGS, notificationsEnabled: true }),
    hasPermission: async () => true,
    fetchPage: (url) => fetchPublicHtml(url),
    notifyChange: async () => undefined,
    ...overrides,
  };
}

export async function resetTestState(): Promise<void> {
  resetMonitorRuntimeForTests();
  await resetDatabase();
  vi.unstubAllGlobals();
}
