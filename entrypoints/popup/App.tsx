import { useState } from 'react';
import { browser } from 'wxt/browser';
import { ArrowUpRight, RefreshCw, Settings } from 'lucide-react';
import { brand } from '@/config/brand';
import { ensureHostPermission, inspectTab } from '@/services/permission.service';
import { sendExtensionMessage } from '@/services/extension-client';
import { toUserMessage } from '@/utils/errors';
import { validatePublicUrl } from '@/utils/url-validator';
import { routePath } from '@/utils/routes';
import { useMonitoringData } from '@/hooks/use-monitors';
import { Logo } from '@/components/common/Logo';
import { ErrorBanner, SuccessBanner } from '@/components/common/Banners';
import { Favicon } from '@/components/common/Favicon';
import { RelativeTime } from '@/components/common/RelativeTime';
import { Button } from '@/components/ui/button';

export function PopupApp() {
  const { monitors, recentChanges, stats, loading } = useMonitoringData();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const byId = new Map(monitors.map((monitor) => [monitor.id, monitor]));

  async function monitorThisPage(): Promise<void> {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        throw new Error('The current tab does not have an address NoticeDiff can read.');
      }
      const validated = validatePublicUrl(tab.url);
      await ensureHostPermission(validated.requestUrl);
      const inspected = tab.id !== undefined ? await inspectTab(tab.id) : null;
      if (inspected?.contentType.toLowerCase().includes('pdf') || validated.url.pathname.toLowerCase().endsWith('.pdf')) {
        throw new Error('PDF monitoring is not supported yet. Open an HTML page instead.');
      }
      const target = inspected ? safeTarget(inspected.href, validated.requestUrl) : validated.requestUrl;
      if (target !== validated.requestUrl) await ensureHostPermission(target);
      const response = await sendExtensionMessage({
        type: 'ADD_MONITOR',
        url: target,
        ...(inspected?.title || tab.title ? { title: inspected?.title || tab.title } : {}),
      });
      setSuccess(`${response.monitor?.title ?? 'This page'} is now being monitored.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : toUserMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function openDashboard(hash = '#/overview'): Promise<void> {
    await browser.tabs.create({ url: `${browser.runtime.getURL('/dashboard.html')}${hash}` });
    window.close();
  }

  return (
    <div className="w-[380px] bg-white text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <div>
            <p className="text-sm font-semibold">{brand.name}</p>
            <p className="text-xs text-slate-500">Watches pages for you</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => void openDashboard(routePath('settings'))}>
          <Settings className="h-4 w-4" />
        </Button>
      </header>
      <div className="space-y-4 p-4">
        <Button className="w-full" size="lg" disabled={pending} onClick={() => void monitorThisPage()}>
          <RefreshCw className="h-4 w-4" />
          {pending ? 'Saving this page…' : 'Monitor This Page'}
        </Button>
        {error ? <ErrorBanner message={error} /> : null}
        {success ? <SuccessBanner message={success} /> : null}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Monitored" value={loading ? '…' : String(stats.total)} />
          <Stat label="Active" value={loading ? '…' : String(stats.active)} />
          <Stat label="Changes" value={loading ? '…' : String(stats.changes)} />
          <Stat label="Needs attention" value={loading ? '…' : String(stats.attention)} />
        </div>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</h2>
          {recentChanges.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">No changes yet. Add a page and NoticeDiff will keep the first version as a quiet baseline.</p>
          ) : (
            <div className="space-y-2">
              {recentChanges.slice(0, 3).map((change) => {
                const monitor = byId.get(change.monitorId);
                return (
                  <button
                    key={change.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-left hover:bg-slate-50"
                    onClick={() => void openDashboard(routePath('change', change.id))}
                  >
                    <Favicon src={monitor?.faviconUrl} alt="" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{monitor?.title ?? 'Website'}</span>
                      <span className="block truncate text-xs text-slate-500">{change.changeSummary}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      <RelativeTime value={change.detectedAt} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <Button className="w-full" variant="outline" onClick={() => void openDashboard()}>
          Open Dashboard
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-lg font-semibold leading-6">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function safeTarget(candidate: string, fallback: string): string {
  try {
    return validatePublicUrl(candidate).requestUrl;
  } catch {
    return fallback;
  }
}
