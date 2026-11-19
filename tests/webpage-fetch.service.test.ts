import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonitorError } from '@/utils/errors';
import { fetchPublicHtml } from '@/services/webpage-fetch.service';
import { htmlResponse, recruitmentPage } from './helpers';

describe('public page fetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows a public redirect and returns the final HTML', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/start')) return new Response(null, { status: 302, headers: { location: 'https://example.com/jobs' } });
      return htmlResponse(recruitmentPage('100', '20 December 2026'));
    });
    vi.stubGlobal('fetch', fetchMock);
    const page = await fetchPublicHtml('https://example.com/start');
    expect(page.finalUrl).toBe('https://example.com/jobs');
    expect(page.html).toContain('Vacancies: 100');
  });

  it('rejects a redirect onto a private address before requesting it', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchPublicHtml('https://example.com/start')).rejects.toMatchObject({ code: 'PRIVATE_NETWORK' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('127.0.0.1');
  });

  it('does not treat HTTP errors as page content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } })));
    await expect(fetchPublicHtml('https://example.com/missing')).rejects.toBeInstanceOf(MonitorError);
  });

  it('reports rate limits with retry-after', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('slow down', { status: 429, headers: { 'retry-after': '30' } })),
    );
    await expect(fetchPublicHtml('https://example.com/jobs')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('follows a redirect when Chrome hides the destination', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.redirect === 'manual') {
        const hidden = new Response(null, { status: 302 });
        Object.defineProperty(hidden, 'type', { value: 'opaqueredirect' });
        return hidden;
      }
      const page = htmlResponse(recruitmentPage('100', '20 December 2026'));
      Object.defineProperty(page, 'url', { value: 'https://cetonline.karnataka.gov.in/kea/' });
      return page;
    });
    vi.stubGlobal('fetch', fetchMock);
    const page = await fetchPublicHtml('https://cetonline.karnataka.gov.in/kea/');
    expect(page.finalUrl).toBe('https://cetonline.karnataka.gov.in/kea/');
    expect(page.html).toContain('Vacancies: 100');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a hidden redirect that lands on a private address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.redirect === 'manual') {
          const hidden = new Response(null, { status: 302 });
          Object.defineProperty(hidden, 'type', { value: 'opaqueredirect' });
          return hidden;
        }
        const page = htmlResponse('<html><body>secret internal page</body></html>');
        Object.defineProperty(page, 'url', { value: 'http://127.0.0.1/secret' });
        return page;
      }),
    );
    await expect(fetchPublicHtml('https://example.com/start')).rejects.toMatchObject({ code: 'PRIVATE_NETWORK' });
  });

  it('rejects PDF responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('%PDF-1.7', { status: 200, headers: { 'content-type': 'application/pdf' } })));
    await expect(fetchPublicHtml('https://example.com/file.pdf')).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
  });
});
