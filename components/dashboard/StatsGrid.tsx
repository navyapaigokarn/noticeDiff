import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function StatsGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <item.icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-6 text-slate-950">{item.value}</span>
            <span className="text-sm text-slate-500">{item.label}</span>
          </span>
        </Card>
      ))}
    </div>
  );
}
