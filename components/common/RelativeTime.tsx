import { formatRelativeTime } from '@/utils/date-utils';

export function RelativeTime({ value }: { value?: number }) {
  if (!value) return <span className="text-slate-500">Not yet</span>;
  return <time dateTime={new Date(value).toISOString()}>{formatRelativeTime(value)}</time>;
}
