import { Globe } from 'lucide-react';
import { useState } from 'react';

export function Favicon({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{alt}</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-8 w-8 rounded-lg border border-slate-200 bg-white object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}
