export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
    </div>
  );
}
