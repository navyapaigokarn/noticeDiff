import { describe, expect, it } from 'vitest';
import { normalizeText } from '@/utils/text-normalizer';

describe('text normalization', () => {
  it('treats different whitespace as the same meaningful content', () => {
    const spaced = 'Vacancies:   100\n\n\nApplication Deadline:\t20 December 2026';
    const compact = 'Vacancies: 100\nApplication Deadline: 20 December 2026';
    expect(normalizeText(spaced)).toBe(normalizeText(compact));
  });

  it('removes invisible characters', () => {
    expect(normalizeText('Results\u200B published')).toBe('Results published');
  });
});
