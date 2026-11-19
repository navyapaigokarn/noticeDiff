import type { MonitorStatus } from '@/types/monitor.types';
import { Badge } from '@/components/ui/badge';

const STYLES: Record<MonitorStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PAUSED: 'border-amber-200 bg-amber-50 text-amber-800',
  ERROR: 'border-red-200 bg-red-50 text-red-800',
};

const LABELS: Record<MonitorStatus, string> = {
  ACTIVE: 'Monitoring',
  PAUSED: 'Paused',
  ERROR: 'Needs attention',
};

export function StatusBadge({ status }: { status: MonitorStatus }) {
  return <Badge className={STYLES[status]}>{LABELS[status]}</Badge>;
}
