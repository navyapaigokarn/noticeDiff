import { describe, expect, it } from 'vitest';
import { MAX_EXTRACTED_CHARACTERS } from '@/config/monitoring';
import { extractFromHtml, looksLikeAccessChallenge } from '@/services/content-extractor.service';
import { recruitmentPage } from './helpers';

describe('content extraction', () => {
  it('extracts title, paragraphs, lists, and tables without scripts or navigation', () => {
    const page = extractFromHtml(recruitmentPage('100', '20 December 2026'), 'https://example.com/jobs');
    expect(page.text).toContain('Title: Recruitment Notification');
    expect(page.text).toContain('Vacancies: 100');
    expect(page.text).toContain('Analyst | 12');
    expect(page.text).toContain('Apply online');
    expect(page.text).not.toContain('secretScript');
    expect(page.text).not.toContain('secretStyle');
    expect(page.text).not.toContain('Home navigation');
  });

  it('falls back to the body when there is no main element', () => {
    const html = '<html><head><title>Notice</title></head><body><p>Application Deadline: 1 January 2027</p><p>Bring identification.</p></body></html>';
    const page = extractFromHtml(html, 'https://example.com/notice');
    expect(page.text).toContain('Application Deadline: 1 January 2027');
  });

  it('returns very little text for an empty page', () => {
    const page = extractFromHtml('<html><head><title>Empty</title></head><body><main>   </main></body></html>', 'https://example.com/empty');
    expect(page.text.length).toBeLessThan(40);
  });

  it('caps excessively large pages', () => {
    const paragraph = `<p>${'Result line. '.repeat(80_000)}</p>`;
    const page = extractFromHtml(`<html><head><title>Large</title></head><body><main>${paragraph}</main></body></html>`, 'https://example.com/large');
    expect(page.truncated).toBe(true);
    expect(page.text.length).toBeLessThanOrEqual(MAX_EXTRACTED_CHARACTERS);
  });

  it('recognizes a short challenge page', () => {
    const html = '<html><title>Just a moment...</title><body>cf-challenge</body></html>';
    expect(looksLikeAccessChallenge(html, 'Just a moment')).toBe(true);
    expect(looksLikeAccessChallenge(recruitmentPage('1', 'today'), recruitmentPage('1', 'today'))).toBe(false);
  });
});
