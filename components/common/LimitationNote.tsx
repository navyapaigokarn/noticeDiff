import { brand } from '@/config/brand';
import { Info } from 'lucide-react';

export function LimitationNote() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{brand.monitoringLimitation}</p>
    </div>
  );
}
