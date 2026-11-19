import { useState } from 'react';
import { MONITOR_INTERVALS, intervalLabel } from '@/config/monitoring';
import { brand } from '@/config/brand';
import { sendExtensionMessage } from '@/services/extension-client';
import { toUserMessage } from '@/utils/errors';
import { routePath } from '@/utils/routes';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { ErrorBanner, SuccessBanner } from '@/components/common/Banners';
import { LimitationNote } from '@/components/common/LimitationNote';
import { LoadingState } from '@/components/common/LoadingState';

export function SettingsView() {
  const { settings, loading, error, update } = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (loading) return <LoadingState label="Loading settings" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Preferences stay on this browser. They are not sent to a server.</p>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {notice ? <SuccessBanner message={notice} /> : null}
      <LimitationNote />
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium">
          Default monitoring frequency
          <Select
            className="mt-1"
            value={settings.defaultIntervalMinutes}
            onChange={(event) => void update({ defaultIntervalMinutes: Number(event.target.value) as typeof settings.defaultIntervalMinutes })}
          >
            {MONITOR_INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {intervalLabel(minutes)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-medium">Desktop notifications</span>
            <span className="text-slate-500">Shown only when a monitored page changes.</span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={settings.notificationsEnabled}
            onChange={(event) => void update({ notificationsEnabled: event.target.checked })}
          />
        </label>
        <label className="block text-sm font-medium">
          Saved versions per website
          <input
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
            type="number"
            min={5}
            max={100}
            value={settings.maxSnapshotsPerMonitor}
            onChange={(event) => void update({ maxSnapshotsPerMonitor: Number(event.target.value) })}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActionError(null);
              void sendExtensionMessage({ type: 'PRUNE_HISTORY' })
                .then(() => setNotice('Older snapshots were cleared.'))
                .catch((caught: unknown) => setActionError(toUserMessage(caught)));
            }}
          >
            Clear old snapshots
          </Button>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            Clear all monitoring data
          </Button>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p>
          {brand.name} {brand.version}
        </p>
        <div className="mt-2 flex gap-4">
          <a className="font-medium text-indigo-700" href={routePath('about')}>
            About
          </a>
          <a className="font-medium text-indigo-700" href={routePath('privacy')}>
            Privacy policy
          </a>
        </div>
      </section>
      <Dialog
        open={confirmClear}
        title="Clear all monitoring data?"
        description="This deletes every monitored website, snapshot, and change on this browser. Settings are kept."
        onClose={() => setConfirmClear(false)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmClear(false);
              void sendExtensionMessage({ type: 'CLEAR_ALL_DATA' })
                .then(() => setNotice('All monitoring data was deleted.'))
                .catch((caught: unknown) => setActionError(toUserMessage(caught)));
            }}
          >
            Delete everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
