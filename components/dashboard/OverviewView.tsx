import { Activity, Clock, Globe, Sparkles } from 'lucide-react';
import { brand } from '@/config/brand';
import type { ChangeEvent } from '@/types/change.types';
import type { MonitoredWebsite } from '@/types/monitor.types';
import type { MonitorStats } from '@/utils/monitor-stats';
import { formatDateTime } from '@/utils/date-utils';
import { routePath } from '@/utils/routes';
import { LimitationNote } from '@/components/common/LimitationNote';
import { RelativeTime } from '@/components/common/RelativeTime';
import { Favicon } from '@/components/common/Favicon';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Button } from '@/components/ui/button';

export function OverviewView({
  stats,
  monitors,
  changes,
  onAdd,
}: {
  stats: MonitorStats;
  monitors: MonitoredWebsite[];
  changes: ChangeEvent[];
  onAdd: () => void;
}) {
  const byId = new Map(monitors.map((monitor) => [monitor.id, monitor]));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{brand.headline}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{brand.tagline}</p>
        </div>
        <Button onClick={onAdd}>Add website</Button>
      </div>
      <StatsGrid
        items={[
          { label: 'Total websites', value: String(stats.total), icon: Globe },
          { label: 'Actively monitoring', value: String(stats.active), icon: Activity },
          { label: 'Changes detected', value: String(stats.changes), icon: Sparkles },
          { label: 'Last checked', value: stats.lastCheckedAt ? formatDateTime(stats.lastCheckedAt) : 'Not yet', icon: Clock },
        ]}
      />
      <LimitationNote />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent changes</h2>
          <a href={routePath('changes')} className="text-sm font-medium text-indigo-700">
            View all
          </a>
        </div>
        {changes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
            Changes will show up here after a monitored page actually updates.
          </p>
        ) : (
          <div className="space-y-2">
            {changes.slice(0, 5).map((change) => {
              const monitor = byId.get(change.monitorId);
              return (
                <a key={change.id} href={routePath('change', change.id)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 hover:border-indigo-200">
                  <Favicon src={monitor?.faviconUrl} alt={monitor?.title ?? 'Website'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-950">{monitor?.title ?? 'Monitored website'}</span>
                      {!change.isRead ? <span className="h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread" /> : null}
                    </span>
                    <span className="block truncate text-sm text-slate-600">{change.changeSummary}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    <RelativeTime value={change.detectedAt} />
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
