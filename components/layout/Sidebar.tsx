import { Bell, Globe, History, Info, LayoutDashboard, Settings } from 'lucide-react';
import { brand } from '@/config/brand';
import { Logo } from '@/components/common/Logo';
import { routePath, type AppView } from '@/utils/routes';
import { cn } from '@/lib/utils';

const ITEMS: Array<{ view: AppView; label: string; icon: typeof Globe }> = [
  { view: 'overview', label: 'Overview', icon: LayoutDashboard },
  { view: 'websites', label: 'All Websites', icon: Globe },
  { view: 'changes', label: 'Recent Changes', icon: History },
  { view: 'notifications', label: 'Notifications', icon: Bell },
  { view: 'settings', label: 'Settings', icon: Settings },
  { view: 'about', label: 'About', icon: Info },
];

export function Sidebar({ current, unread }: { current: AppView; unread: number }) {
  return (
    <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-4">
        <Logo />
        <div>
          <p className="text-sm font-semibold text-slate-950">{brand.name}</p>
          <p className="text-xs text-slate-500">Local monitoring</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {ITEMS.map((item) => {
          const active = current === item.view || (item.view === 'websites' && current === 'website') || (item.view === 'changes' && current === 'change');
          const Icon = item.icon;
          return (
            <a
              key={item.view}
              href={routePath(item.view)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100',
                active && 'bg-indigo-50 text-indigo-800',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.view === 'notifications' && unread > 0 ? (
                <span className="ml-auto rounded-full bg-indigo-600 px-1.5 text-[11px] text-white">{unread}</span>
              ) : null}
            </a>
          );
        })}
      </nav>
      <a href={routePath('privacy')} className="hidden px-5 py-4 text-xs text-slate-500 hover:text-slate-800 md:block">
        Privacy policy
      </a>
    </aside>
  );
}
