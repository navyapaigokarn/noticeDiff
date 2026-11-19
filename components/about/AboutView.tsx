import { brand } from '@/config/brand';
import { routePath } from '@/utils/routes';
import { LimitationNote } from '@/components/common/LimitationNote';

export function AboutView() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">About {brand.name}</h1>
      <p>{brand.tagline}</p>
      <p>
        {brand.name} is a local-first Chrome extension. It saves a baseline of the public text on a page you choose, checks that page on a schedule while Chrome is running, and shows exactly what was added or removed.
      </p>
      <LimitationNote />
      <p>Version {brand.version}. Payments, accounts, and cloud monitoring are not part of this release.</p>
      <a className="font-medium text-indigo-700" href={routePath('privacy')}>
        Read the privacy policy
      </a>
    </article>
  );
}
