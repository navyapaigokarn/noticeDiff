import { useState } from 'react';
import { formatDateTime } from '@/utils/date-utils';
import { routePath } from '@/utils/routes';
import { useMonitorActions } from '@/hooks/use-monitor-actions';
import { useWebsiteHistory } from '@/hooks/use-monitors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorBanner, SuccessBanner } from '@/components/common/Banners';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/monitor/StatusBadge';

export function WebsiteHistoryView({ monitorId }: { monitorId: string }) {
  const { monitor, snapshots, changes, loading } = useWebsiteHistory(monitorId);
  const actions = useMonitorActions();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading) return <LoadingState label="Loading history" />;
  if (!monitor) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Website not found</h1>
        <p className="text-sm text-slate-600">It may have been deleted from this browser.</p>
        <a href={routePath('websites')} className="text-sm font-medium text-indigo-700">
          Back to websites
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <a href={routePath('websites')} className="text-sm font-medium text-indigo-700">
        Back to websites
      </a>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{monitor.title}</h1>
            <StatusBadge status={monitor.status} />
          </div>
          <a href={monitor.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-slate-500 hover:text-indigo-700">
            {monitor.url}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={actions.pendingId === monitor.id} onClick={() => void actions.checkNow(monitor.id)}>
            Check now
          </Button>
          {monitor.status === 'PAUSED' ? (
            <Button variant="outline" onClick={() => void actions.resume(monitor.id)}>
              Resume
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void actions.pause(monitor.id)}>
              Pause
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>
      {actions.notice?.tone === 'error' ? <ErrorBanner message={actions.notice.text} /> : null}
      {actions.notice?.tone === 'success' ? <SuccessBanner message={actions.notice.text} /> : null}
      {monitor.lastError ? <ErrorBanner message={monitor.lastError} /> : null}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Change history</h2>
        {changes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
            No changes yet. The first saved version is the baseline and does not create a notification.
          </p>
        ) : (
          changes.map((change) => (
            <a key={change.id} href={routePath('change', change.id)} className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-200">
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-900">{change.changeSummary}</span>
                <span className="text-slate-500">{formatDateTime(change.detectedAt)}</span>
              </span>
            </a>
          ))
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Saved versions</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="grid gap-1 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium text-slate-900">{snapshot.title || monitor.title}</p>
                <p className="font-mono text-xs text-slate-500">{snapshot.contentHash.slice(0, 16)}</p>
              </div>
              <p className="text-slate-500">{formatDateTime(snapshot.fetchedAt)}</p>
            </div>
          ))}
        </div>
      </section>
      <Dialog open={confirmDelete} title="Delete this website?" description="Saved versions and change history will be removed from this browser." onClose={() => setConfirmDelete(false)}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDelete(false);
              void actions.remove(monitor.id).then(() => {
                window.location.hash = routePath('websites');
              });
            }}
          >
            Delete website
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
