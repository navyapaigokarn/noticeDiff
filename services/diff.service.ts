import { diffLines, type ChangeObject } from 'diff';
import type { ContentDiff, ModifiedSection } from '@/types/change.types';

export interface DiffLine {
  kind: 'added' | 'removed' | 'unchanged';
  text: string;
}

export type DisplayDiffLine = DiffLine | { kind: 'collapsed'; count: number };

const LABEL_PATTERN = /^([^:]{1,80}):\s*(.+)$/;
const STORED_LINE_LIMIT = 50;

export function compareContent(previous: string, next: string): ContentDiff {
  if (previous === next) {
    return { identical: true, added: [], removed: [], modified: [], summary: 'No meaningful change' };
  }

  const parts = diffLines(ensureNewline(previous), ensureNewline(next));
  const added: string[] = [];
  const removed: string[] = [];
  const modified: ModifiedSection[] = [];
  let pendingRemoved: string[] = [];

  const flushRemoved = (): void => {
    removed.push(...pendingRemoved);
    pendingRemoved = [];
  };

  for (const part of parts) {
    const lines = linesFromChange(part);
    if (part.removed) {
      pendingRemoved.push(...lines);
      continue;
    }
    if (part.added) {
      const paired = pairHunk(pendingRemoved, lines);
      modified.push(...paired.modified);
      removed.push(...paired.removed);
      added.push(...paired.added);
      pendingRemoved = [];
      continue;
    }
    flushRemoved();
  }
  flushRemoved();

  const diff: ContentDiff = {
    identical: added.length === 0 && removed.length === 0 && modified.length === 0,
    added,
    removed,
    modified,
    summary: '',
  };
  diff.summary = diff.identical ? 'No meaningful change' : buildChangeSummary(diff);
  return diff;
}

export function limitStoredLines(lines: string[]): string[] {
  return lines.slice(0, STORED_LINE_LIMIT);
}

export function diffLinesDetailed(previous: string, next: string): DiffLine[] {
  const parts = diffLines(ensureNewline(previous), ensureNewline(next));
  const lines: DiffLine[] = [];
  for (const part of parts) {
    const kind = part.added ? 'added' : part.removed ? 'removed' : 'unchanged';
    for (const text of linesFromChange(part)) {
      lines.push({ kind, text });
    }
  }
  return lines;
}

export function collapseUnchanged(lines: readonly DiffLine[], context = 2): DisplayDiffLine[] {
  const changed = lines.map((line) => line.kind !== 'unchanged');
  const visible = changed.map((isChanged, index) => {
    if (isChanged) return true;
    for (let cursor = Math.max(0, index - context); cursor <= Math.min(lines.length - 1, index + context); cursor += 1) {
      if (changed[cursor]) return true;
    }
    return false;
  });

  const result: DisplayDiffLine[] = [];
  let hidden = 0;
  const flushHidden = (): void => {
    if (hidden > 0) {
      result.push({ kind: 'collapsed', count: hidden });
      hidden = 0;
    }
  };

  lines.forEach((line, index) => {
    if (visible[index]) {
      flushHidden();
      result.push(line);
      return;
    }
    hidden += 1;
  });
  flushHidden();
  return result;
}

export function buildChangeSummary(diff: Pick<ContentDiff, 'added' | 'removed' | 'modified'>): string {
  const parts: string[] = [];
  const first = diff.modified[0];
  if (first) {
    const extra = diff.modified.length - 1;
    const sentence = `${first.label} changed from ${truncate(first.previous, 40)} to ${truncate(first.next, 40)}`;
    parts.push(extra > 0 ? `${sentence} (+${extra} more)` : sentence);
  }
  if (diff.added.length > 0) {
    parts.push(`${diff.added.length} section${diff.added.length === 1 ? '' : 's'} added`);
  }
  if (diff.removed.length > 0) {
    parts.push(`${diff.removed.length} section${diff.removed.length === 1 ? '' : 's'} removed`);
  }
  return parts.join('. ') || 'Page content changed';
}

function pairHunk(removed: string[], added: string[]): { modified: ModifiedSection[]; removed: string[]; added: string[] } {
  if (removed.length === 1 && added.length === 1) {
    const previous = removed[0];
    const next = added[0];
    if (previous !== undefined && next !== undefined) {
      return { modified: [toModification(previous, next)], removed: [], added: [] };
    }
  }

  const modified: ModifiedSection[] = [];
  const used = new Set<number>();
  const unmatchedRemoved: string[] = [];

  for (const previous of removed) {
    const label = labelOf(previous);
    let matchIndex = -1;
    if (label) {
      matchIndex = added.findIndex((line, index) => !used.has(index) && labelOf(line) === label);
    }
    if (matchIndex === -1 && removed.length === added.length) {
      matchIndex = added.findIndex((_, index) => !used.has(index));
    }
    const next = matchIndex >= 0 ? added[matchIndex] : undefined;
    if (matchIndex >= 0 && next !== undefined) {
      used.add(matchIndex);
      modified.push(toModification(previous, next));
    } else {
      unmatchedRemoved.push(previous);
    }
  }

  const unmatchedAdded = added.filter((_, index) => !used.has(index));
  return { modified, removed: unmatchedRemoved, added: unmatchedAdded };
}

function toModification(previous: string, next: string): ModifiedSection {
  const oldMatch = LABEL_PATTERN.exec(previous);
  const newMatch = LABEL_PATTERN.exec(next);
  if (oldMatch?.[1] && oldMatch[2] && newMatch?.[2] && labelOf(previous) === labelOf(next)) {
    return { label: oldMatch[1].trim(), previous: oldMatch[2].trim(), next: newMatch[2].trim() };
  }
  return { label: 'Updated text', previous, next };
}

function labelOf(line: string): string | null {
  const match = LABEL_PATTERN.exec(line);
  return match?.[1] ? match[1].trim().toLowerCase() : null;
}

function linesFromChange(part: ChangeObject<string>): string[] {
  const split = part.value.split('\n');
  if (split[split.length - 1] === '') split.pop();
  return split;
}

function ensureNewline(value: string): string {
  if (value.length === 0) return '\n';
  return value.endsWith('\n') ? value : `${value}\n`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
