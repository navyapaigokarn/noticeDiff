import { Bell } from 'lucide-react';
import type { ChangeEvent } from '@/types/change.types';
import type { MonitoredWebsite } from '@/types/monitor.types';
import { routePath } from '@/utils/routes';
import { sendExtensionMessage } from '@/services/extension-client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { RelativeTime } from '@/components/common/RelativeTime';

export function NotificationsView({ changes, monitors }: { changes: ChangeEvent[]; monitors: MonitoredWebsite[] }) {
  const byId = new Map(monitors.map((monitor) => [monitor.id, monitor]));
  const unread = changes.filter((change) => !change.isRead).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Unread changes stay marked until you open them.</p>
        </div>
        <Button variant="outline" disabled={unread === 0} onClick={() => void sendExtensionMessage({ type: 'MARK_ALL_CHANGES_READ' })}>
          Mark all read
        </Button>
      </div>
      {changes.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="A desktop notification is sent only when a monitored page changes. Failed checks and the first baseline stay quiet." />
      ) : (
        <div className="space-y-2">
          {changes.map((change) => (
            <a key={change.id} href={routePath('change', change.id)} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-200">
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-950">{byId.get(change.monitorId)?.title ?? 'Monitored website'}</span>
                {!change.isRead ? <span className="text-xs font-medium text-indigo-700">Unread</span> : <span className="text-xs text-slate-400">Read</span>}
              </span>
              <span className="mt-1 block text-sm text-slate-600">{change.changeSummary}</span>
              <span className="mt-1 block text-xs text-slate-500">
                <RelativeTime value={change.detectedAt} />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
