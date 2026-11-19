export type AppView =
  | 'overview'
  | 'websites'
  | 'website'
  | 'changes'
  | 'change'
  | 'notifications'
  | 'settings'
  | 'about'
  | 'privacy';

export interface AppRoute {
  view: AppView;
  id?: string;
}

export function parseHash(hash: string): AppRoute {
  const parts = (hash.replace(/^#/, '') || '/overview').split('/').filter(Boolean);
  const [head, id] = parts;
  if (head === 'websites' && id) return { view: 'website', id: decodeURIComponent(id) };
  if (head === 'changes' && id) return { view: 'change', id: decodeURIComponent(id) };
  if (head === 'websites') return { view: 'websites' };
  if (head === 'changes') return { view: 'changes' };
  if (head === 'notifications') return { view: 'notifications' };
  if (head === 'settings') return { view: 'settings' };
  if (head === 'about') return { view: 'about' };
  if (head === 'privacy') return { view: 'privacy' };
  return { view: 'overview' };
}

export function routePath(view: AppView, id?: string): string {
  if ((view === 'website' || view === 'change') && id) {
    const section = view === 'website' ? 'websites' : 'changes';
    return `#/${section}/${encodeURIComponent(id)}`;
  }
  return `#/${view === 'overview' ? 'overview' : view}`;
}
