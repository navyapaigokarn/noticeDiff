import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dialog } from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingState } from '@/components/common/LoadingState';
import { AboutView } from '@/components/about/AboutView';
import { PrivacyView } from '@/components/about/PrivacyView';
import { AddWebsiteForm } from '@/components/dashboard/AddWebsiteForm';
import { ChangeDetailView } from '@/components/dashboard/ChangeDetailView';
import { ChangesView } from '@/components/dashboard/ChangesView';
import { NotificationsView } from '@/components/dashboard/NotificationsView';
import { OverviewView } from '@/components/dashboard/OverviewView';
import { WebsiteHistoryView } from '@/components/dashboard/WebsiteHistoryView';
import { WebsitesView } from '@/components/dashboard/WebsitesView';
import { SettingsView } from '@/components/settings/SettingsView';
import { useHashRoute } from '@/hooks/use-hash-route';
import { useMonitoringData } from '@/hooks/use-monitors';
import { useSettings } from '@/hooks/use-settings';

export function DashboardApp() {
  const route = useHashRoute();
  const data = useMonitoringData();
  const settings = useSettings();
  const [adding, setAdding] = useState(false);

  let content = <OverviewView stats={data.stats} monitors={data.monitors} changes={data.recentChanges} onAdd={() => setAdding(true)} />;
  if (route.view === 'websites') content = <WebsitesView monitors={data.monitors} unreadMonitorIds={data.unreadMonitorIds} onAdd={() => setAdding(true)} />;
  if (route.view === 'website' && route.id) content = <WebsiteHistoryView monitorId={route.id} />;
  if (route.view === 'changes') content = <ChangesView changes={data.recentChanges} monitors={data.monitors} />;
  if (route.view === 'change' && route.id) content = <ChangeDetailView changeId={route.id} />;
  if (route.view === 'notifications') content = <NotificationsView changes={data.recentChanges} monitors={data.monitors} />;
  if (route.view === 'settings') content = <SettingsView />;
  if (route.view === 'about') content = <AboutView />;
  if (route.view === 'privacy') content = <PrivacyView />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <Sidebar current={route.view} unread={data.stats.unread} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <ErrorBoundary>{data.loading && route.view !== 'settings' && route.view !== 'about' && route.view !== 'privacy' ? <LoadingState /> : content}</ErrorBoundary>
      </main>
      <Dialog open={adding} title="Monitor a website" description="NoticeDiff will request permission for this site, then save the current public text as the baseline." onClose={() => setAdding(false)}>
        <AddWebsiteForm defaultInterval={settings.settings.defaultIntervalMinutes} onAdded={() => setAdding(false)} />
      </Dialog>
    </div>
  );
}
