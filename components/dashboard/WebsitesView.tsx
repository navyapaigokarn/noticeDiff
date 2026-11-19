import { useMemo, useState } from 'react';
import { Globe, Pause, Play, RefreshCw, Search, Trash2 } from 'lucide-react';
import { MONITOR_INTERVALS, intervalLabel } from '@/config/monitoring';
import type { MonitoredWebsite } from '@/types/monitor.types';
import { routePath } from '@/utils/routes';
import { useMonitorActions } from '@/hooks/use-monitor-actions';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBanner, SuccessBanner } from '@/components/common/Banners';
import { Favicon } from '@/components/common/Favicon';
import { RelativeTime } from '@/components/common/RelativeTime';
import { StatusBadge } from '@/components/monitor/StatusBadge';

type Filter = 'all' | 'active' | 'paused' | 'changes' | 'errors';
type Sort = 'added' | 'name' | 'checked' | 'changed';

export function WebsitesView({
  monitors,
  unreadMonitorIds,
  onAdd,
}: {
  monitors: MonitoredWebsite[];
  unreadMonitorIds: Set<string>;
  onAdd: () => void;
}) {
  const actions = useMonitorActions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('added');
  const [pendingDelete, setPendingDelete] = useState<MonitoredWebsite | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = monitors.filter((monitor) => {
      const matchesQuery = !needle || [monitor.title, monitor.hostname, monitor.url].some((value) => value.toLowerCase().includes(needle));
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && monitor.status === 'ACTIVE') ||
        (filter === 'paused' && monitor.status === 'PAUSED') ||
        (filter === 'errors' && monitor.status === 'ERROR') ||
        (filter === 'changes' && monitor.lastChangeAt !== undefined);
      return matchesQuery && matchesFilter;
    });
    return filtered.sort((a, b) => compareMonitors(a, b, sort));
  }, [monitors, query, filter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">All websites</h1>
          <p className="mt-1 text-sm text-slate-600">Search, filter, and check the pages you are watching.</p>
        </div>
        <Button onClick={onAdd}>Add website</Button>
      </div>
      {actions.notice?.tone === 'error' ? <ErrorBanner message={actions.notice.text} /> : null}
      {actions.notice?.tone === 'success' ? <SuccessBanner message={actions.notice.text} /> : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or domain" />
        </div>
        <Select className="lg:w-44" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort websites">
          <option value="added">Recently added</option>
          <option value="name">Name</option>
          <option value="checked">Last checked</option>
          <option value="changed">Last change</option>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['paused', 'Paused'],
            ['changes', 'Changes detected'],
            ['errors', 'Errors'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-sm ${filter === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={monitors.length === 0 ? 'No websites yet' : 'No websites match'}
          description={
            monitors.length === 0
              ? 'Add a public page and NoticeDiff will save a baseline, then watch it for meaningful text changes.'
              : 'Try a different search or filter.'
          }
          action={monitors.length === 0 ? <Button onClick={onAdd}>Add website</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((monitor) => (
            <article key={monitor.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <Favicon src={monitor.faviconUrl} alt={monitor.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-slate-950">{monitor.title}</h2>
                    <StatusBadge status={monitor.status} />
                    {unreadMonitorIds.has(monitor.id) ? <span className="text-xs font-medium text-indigo-700">Unread change</span> : null}
                  </div>
                  <p className="truncate text-sm text-slate-500">{monitor.hostname}</p>
                  {monitor.lastError ? <p className="mt-1 text-sm text-red-700">{monitor.lastError}</p> : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                <div>Frequency: {intervalLabel(monitor.intervalMinutes)}</div>
                <div>
                  Last checked: <RelativeTime value={monitor.lastCheckedAt} />
                </div>
                <div>
                  Last change: <RelativeTime value={monitor.lastChangeAt} />
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={actions.pendingId === monitor.id} onClick={() => void actions.checkNow(monitor.id)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check now
                </Button>
                {monitor.status === 'PAUSED' ? (
                  <Button size="sm" variant="outline" onClick={() => void actions.resume(monitor.id)}>
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => void actions.pause(monitor.id)}>
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </Button>
                )}
                <a href={routePath('website', monitor.id)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50">
                  View history
                </a>
                <Select
                  className="h-8 w-auto text-xs"
                  aria-label={`Frequency for ${monitor.title}`}
                  value={monitor.intervalMinutes}
                  onChange={(event) => void actions.updateInterval(monitor.id, Number(event.target.value))}
                >
                  {MONITOR_INTERVALS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {intervalLabel(minutes)}
                    </option>
                  ))}
                </Select>
                <Button size="sm" variant="danger" onClick={() => setPendingDelete(monitor)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={pendingDelete !== null}
        title="Delete this website?"
        description="This permanently removes the website, saved versions, and change history from this browser."
        onClose={() => setPendingDelete(null)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!pendingDelete) return;
              const id = pendingDelete.id;
              setPendingDelete(null);
              void actions.remove(id);
            }}
          >
            Delete website
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function compareMonitors(a: MonitoredWebsite, b: MonitoredWebsite, sort: Sort): number {
  if (sort === 'name') return a.title.localeCompare(b.title);
  if (sort === 'checked') return (b.lastCheckedAt ?? 0) - (a.lastCheckedAt ?? 0);
  if (sort === 'changed') return (b.lastChangeAt ?? 0) - (a.lastChangeAt ?? 0);
  return b.createdAt - a.createdAt;
}
