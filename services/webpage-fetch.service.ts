import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, MAX_REDIRECTS } from '@/config/monitoring';
import { MonitorError } from '@/utils/errors';
import { validatePublicUrl } from '@/utils/url-validator';

export interface FetchedDocument {
  html: string;
  finalUrl: string;
  contentType: string;
}

export interface FetchOptions {
  hasPermission?: (url: string) => Promise<boolean>;
  timeoutMs?: number;
}

export async function fetchPublicHtml(url: string, options: FetchOptions = {}): Promise<FetchedDocument> {
  let current = validatePublicUrl(url).requestUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertCanRead(current, options);
    const response = await request(current, 'manual', options);

    // Chrome hides the Location header for extension fetches that use manual redirects.
    // Follow the redirect, then accept the page only when the final address is still public.
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400 && !response.headers.get('location'))) {
      return finishFollowedRedirect(current, options);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new MonitorError('The website returned a redirect without a destination.', 'HTTP_ERROR');
      }
      current = validatePublicUrl(new URL(location, current).toString()).requestUrl;
      continue;
    }

    return readDocument(response, current);
  }

  throw new MonitorError('The website redirected too many times.', 'HTTP_ERROR');
}

async function finishFollowedRedirect(url: string, options: FetchOptions): Promise<FetchedDocument> {
  const response = await request(url, 'follow', options);
  const landed = response.url || url;
  let finalUrl: string;
  try {
    finalUrl = validatePublicUrl(landed).requestUrl;
  } catch (error) {
    if (error instanceof MonitorError) throw error;
    throw new MonitorError('The website redirected somewhere NoticeDiff cannot monitor.', 'HTTP_ERROR');
  }
  await assertCanRead(finalUrl, options);
  return readDocument(response, finalUrl);
}

export function parseRetryAfter(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - now);
  return undefined;
}

async function request(url: string, redirect: 'manual' | 'follow', options: FetchOptions): Promise<Response> {
  try {
    return await fetch(url, {
      method: 'GET',
      redirect,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new MonitorError('The website took too long to respond. This was not recorded as a content change.', 'TIMEOUT');
    }
    throw new MonitorError('The website could not be reached. Check your connection and try again.', 'NETWORK');
  }
}

async function assertCanRead(url: string, options: FetchOptions): Promise<void> {
  if (!options.hasPermission) return;
  const allowed = await options.hasPermission(url);
  if (!allowed) {
    throw new MonitorError(
      'NoticeDiff does not have permission to read this website. Allow access for the site and try again.',
      'PERMISSION_DENIED',
    );
  }
}

async function readDocument(response: Response, finalUrl: string): Promise<FetchedDocument> {
  if (response.status === 429) {
    const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
    throw new MonitorError('The website asked NoticeDiff to slow down (HTTP 429). It will be checked again later.', 'RATE_LIMITED', {
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    });
  }

  if (response.status === 403) {
    throw new MonitorError('The website refused access (HTTP 403). NoticeDiff only reads public pages.', 'HTTP_ERROR');
  }
  if (response.status === 404) {
    throw new MonitorError('The page was not found (HTTP 404). This was not recorded as a content change.', 'HTTP_ERROR');
  }
  if (!response.ok) {
    throw new MonitorError(
      `The website returned an error (HTTP ${response.status}). This was not recorded as a content change.`,
      'HTTP_ERROR',
    );
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const html = await readLimitedText(response);
  assertSupportedDocument(contentType, html);
  return { html, finalUrl, contentType: contentType || 'text/html' };
}

function assertSupportedDocument(contentType: string, html: string): void {
  const sample = html.slice(0, 300).trim().toLowerCase();
  if (contentType.includes('pdf') || sample.startsWith('%pdf')) {
    throw new MonitorError('PDF monitoring is not supported yet. Choose an HTML page instead.', 'UNSUPPORTED_TYPE');
  }
  const htmlType = contentType.includes('text/html') || contentType.includes('application/xhtml');
  const looksLikeHtml = sample.startsWith('<!doctype html') || sample.startsWith('<html') || sample.startsWith('<head') || sample.startsWith('<body') || sample.includes('<html');
  if (contentType && !htmlType && !contentType.includes('text/plain')) {
    if (!(contentType.includes('octet-stream') && looksLikeHtml)) {
      throw new MonitorError(
        'This address does not look like an HTML page. NoticeDiff currently monitors public HTML pages.',
        'UNSUPPORTED_TYPE',
      );
    }
  }
  if (!htmlType && !looksLikeHtml && contentType.includes('text/plain') === false) {
    throw new MonitorError(
      'This address does not look like an HTML page. NoticeDiff currently monitors public HTML pages.',
      'UNSUPPORTED_TYPE',
    );
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) {
    throw new MonitorError('This page is larger than NoticeDiff can safely monitor.', 'TOO_LARGE');
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > MAX_HTML_BYTES) {
      throw new MonitorError('This page is larger than NoticeDiff can safely monitor.', 'TOO_LARGE');
    }
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new MonitorError('This page is larger than NoticeDiff can safely monitor.', 'TOO_LARGE');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
