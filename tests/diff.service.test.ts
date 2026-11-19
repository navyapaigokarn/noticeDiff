import { describe, expect, it } from 'vitest';
import { collapseUnchanged, compareContent, diffLinesDetailed } from '@/services/diff.service';

const original = ['Title: Recruitment Notification', 'Post: Software Engineer', 'Vacancies: 100', 'Application Deadline: 20 December 2026'].join('\n');

describe('content comparison', () => {
  it('ignores identical text', () => {
    expect(compareContent(original, original).identical).toBe(true);
  });

  it('reports a changed vacancy count and deadline', () => {
    const updated = original.replace('Vacancies: 100', 'Vacancies: 150').replace('20 December 2026', '25 December 2026');
    const diff = compareContent(original, updated);
    expect(diff.modified).toEqual([
      { label: 'Vacancies', previous: '100', next: '150' },
      { label: 'Application Deadline', previous: '20 December 2026', next: '25 December 2026' },
    ]);
    expect(diff.summary).toContain('Vacancies');
  });

  it('reports an added paragraph', () => {
    const diff = compareContent(original, `${original}\nInterview date: 2 January 2027`);
    expect(diff.added).toContain('Interview date: 2 January 2027');
    expect(diff.removed).toHaveLength(0);
  });

  it('reports a removed paragraph', () => {
    const diff = compareContent(`${original}\nInterview date: 2 January 2027`, original);
    expect(diff.removed).toContain('Interview date: 2 January 2027');
  });

  it('reports a changed page title', () => {
    const diff = compareContent(original, original.replace('Title: Recruitment Notification', 'Title: Final Results'));
    expect(diff.modified[0]).toMatchObject({ label: 'Title', previous: 'Recruitment Notification', next: 'Final Results' });
  });

  it('highlights added and removed lines', () => {
    const lines = diffLinesDetailed(original, `${original}\nNew note`);
    expect(lines.some((line) => line.kind === 'added' && line.text === 'New note')).toBe(true);
    expect(lines.some((line) => line.kind === 'unchanged')).toBe(true);
  });

  it('collapses long unchanged stretches', () => {
    const previous = Array.from({ length: 20 }, (_, index) => `Line ${index}`).join('\n');
    const next = previous.replace('Line 10', 'Line changed');
    const collapsed = collapseUnchanged(diffLinesDetailed(previous, next), 1);
    expect(collapsed.some((line) => line.kind === 'collapsed' && line.count > 1)).toBe(true);
  });
});
