import { useEffect, useState } from 'react';
import { parseHash, type AppRoute } from '@/utils/routes';

export function useHashRoute(): AppRoute {
  const [hash, setHash] = useState(() => window.location.hash || '#/overview');

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/overview');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return parseHash(hash);
}
