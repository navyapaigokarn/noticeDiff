import { useState } from 'react';
import { collapseUnchanged, diffLinesDetailed, type DisplayDiffLine } from '@/services/diff.service';
import type { ModifiedSection } from '@/types/change.types';
import { Button } from '@/components/ui/button';

export function DiffView({ previous, next }: { previous: string; next: string }) {
  const [full, setFull] = useState(false);
  const lines = diffLinesDetailed(previous, next);
  const visible = full ? lines : collapseUnchanged(lines);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Added text is green. Removed text is red.</p>
        <Button variant="outline" size="sm" onClick={() => setFull((value) => !value)}>
          {full ? 'Show changes only' : 'Show full text'}
        </Button>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-200 bg-white">
        {visible.map((line, index) => (
          <DiffRow key={`${line.kind}-${index}`} line={line} />
        ))}
      </div>
    </div>
  );
}

function DiffRow({ line }: { line: DisplayDiffLine }) {
  if (line.kind === 'collapsed') {
    return <div className="px-3 py-2 text-xs text-slate-500">… {line.count} unchanged lines hidden</div>;
  }
  const tone =
    line.kind === 'added'
      ? 'bg-emerald-50 text-emerald-950'
      : line.kind === 'removed'
        ? 'bg-red-50 text-red-950 line-through decoration-red-400'
        : 'text-slate-700';
  const prefix = line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '− ' : '  ';
  return <div className={`whitespace-pre-wrap px-3 py-1 font-mono text-[13px] leading-6 ${tone}`}>{`${prefix}${line.text}`}</div>;
}

export function ModificationList({ items }: { items: ModifiedSection[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <p className="font-medium text-slate-900">Modified: {item.label}</p>
          <p className="mt-1 text-red-700">Old: {item.previous}</p>
          <p className="text-emerald-700">New: {item.next}</p>
        </div>
      ))}
    </div>
  );
}

export function SideBySide({ previous, next }: { previous: string; next: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <TextPane title="Previous" text={previous} tone="border-red-200" />
      <TextPane title="Updated" text={next} tone="border-emerald-200" />
    </div>
  );
}

function TextPane({ title, text, tone }: { title: string; text: string; tone: string }) {
  return (
    <section className={`max-h-[32rem] overflow-auto rounded-xl border bg-white ${tone}`}>
      <h3 className="sticky top-0 border-b border-slate-200 bg-white px-3 py-2 text-sm font-medium">{title}</h3>
      <pre className="whitespace-pre-wrap px-3 py-3 font-sans text-sm leading-6 text-slate-800">{text}</pre>
    </section>
  );
}
