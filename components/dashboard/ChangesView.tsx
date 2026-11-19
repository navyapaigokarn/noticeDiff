import { History } from 'lucide-react';
import type { ChangeEvent } from '@/types/change.types';
import type { MonitoredWebsite } from '@/types/monitor.types';
import { routePath } from '@/utils/routes';
import { EmptyState } from '@/components/common/EmptyState';
import { Favicon } from '@/components/common/Favicon';
import { RelativeTime } from '@/components/common/RelativeTime';

export function ChangesView({ changes, monitors }: { changes: ChangeEvent[]; monitors: MonitoredWebsite[] }) {
  const byId = new Map(monitors.map((monitor) => [monitor.id, monitor]));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recent changes</h1>
        <p className="mt-1 text-sm text-slate-600">Every saved comparison between a previous version and the latest page.</p>
      </div>
      {changes.length === 0 ? (
        <EmptyState icon={History} title="No changes yet" description="NoticeDiff records a change only when the meaningful text of a monitored page is different from the last saved version." />
      ) : (
        <div className="space-y-2">
          {changes.map((change) => {
            const monitor = byId.get(change.monitorId);
            return (
              <a key={change.id} href={routePath('change', change.id)} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-200">
                <Favicon src={monitor?.faviconUrl} alt="" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-950">{monitor?.title ?? 'Monitored website'}</span>
                    {!change.isRead ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Unread</span> : null}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">{change.changeSummary}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    <RelativeTime value={change.detectedAt} />
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
