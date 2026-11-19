import { describe, expect, it } from 'vitest';
import { sha256 } from '@/utils/content-hash';
import { normalizeText } from '@/utils/text-normalizer';

describe('content hashing', () => {
  it('returns a stable sha-256 hex digest', async () => {
    const hash = await sha256('Vacancies: 100');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(await sha256('Vacancies: 100'));
    expect(hash).not.toBe(await sha256('Vacancies: 150'));
  });

  it('hashes normalized whitespace to the same value', async () => {
    const left = await sha256(normalizeText('Vacancies:   100\n\n'));
    const right = await sha256(normalizeText('Vacancies: 100'));
    expect(left).toBe(right);
  });
});
