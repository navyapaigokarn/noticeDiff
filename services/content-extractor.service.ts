import { parseHTML } from 'linkedom';
import { MAX_EXTRACTED_CHARACTERS, MIN_CONTENT_CHARACTERS } from '@/config/monitoring';
import { MonitorError } from '@/utils/errors';
import { normalizeInline, normalizeText } from '@/utils/text-normalizer';
import { validatePublicUrl } from '@/utils/url-validator';

export interface ExtractedPage {
  title: string;
  text: string;
  faviconUrl?: string;
  truncated: boolean;
}

const CAPTCHA_MARKERS = [
  'cf-browser-verification',
  'cf-challenge',
  '/cdn-cgi/challenge-platform',
  'g-recaptcha',
  'h-captcha',
  'just a moment...',
  'attention required! | cloudflare',
  'verify you are human',
];

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'CANVAS']);
const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,tr,blockquote,pre';
const BLOCK_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'TR', 'BLOCKQUOTE', 'PRE', 'FIGCAPTION', 'DT', 'DD']);

interface DomNode {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
}

interface DomElement extends DomNode {
  tagName: string;
  children: ArrayLike<DomElement>;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
  getAttribute(name: string): string | null;
  remove(): void;
}

interface ParsedDocument {
  title: string;
  body: DomElement | null;
  documentElement: DomElement;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
}

export function extractFromHtml(html: string, pageUrl: string): ExtractedPage {
  let document: ParsedDocument;
  try {
    document = parseHTML(html).document as unknown as ParsedDocument;
  } catch {
    throw new MonitorError('NoticeDiff could not read the page structure.', 'PARSE');
  }

  for (const node of Array.from(document.querySelectorAll('script, style, noscript, template'))) {
    node.remove();
  }

  const title = normalizeInline(document.title || document.querySelector('title')?.textContent || '');
  const root = pickRoot(document);
  let lines = collectLines(root);
  const footer = document.querySelector('footer');
  if (footer && root !== footer && !containsNode(root, footer)) {
    const footerLines = collectLines(footer);
    if (footerLines.join(' ').length >= 20) lines = lines.concat(footerLines);
  }
  if (lines.length === 0 && document.body) {
    const fallback = normalizeText(document.body.textContent ?? '');
    if (fallback) lines = fallback.split('\n');
  }

  const contentLines = title ? [`Title: ${title}`, ...lines.filter((line) => line !== title)] : lines;
  let text = normalizeText(contentLines.join('\n'));
  let truncated = false;
  if (text.length > MAX_EXTRACTED_CHARACTERS) {
    text = text.slice(0, MAX_EXTRACTED_CHARACTERS);
    truncated = true;
  }

  const faviconUrl = resolveFavicon(document, pageUrl);
  return { title, text, ...(faviconUrl ? { faviconUrl } : {}), truncated };
}

export function assertMeaningfulContent(text: string): void {
  if (text.trim().length < MIN_CONTENT_CHARACTERS) {
    throw new MonitorError(
      'The page did not include enough readable text to monitor. It may be empty, blocked, or require a sign-in.',
      'EMPTY_PAGE',
    );
  }
}

export function looksLikeAccessChallenge(html: string, extractedText: string): boolean {
  const sample = html.slice(0, 80_000).toLowerCase();
  const matched = CAPTCHA_MARKERS.some((marker) => sample.includes(marker));
  return matched && extractedText.length < 800;
}

function pickRoot(document: ParsedDocument): DomElement {
  const candidates = [document.querySelector('main'), document.querySelector('article'), document.querySelector('[role="main"]')];
  for (const candidate of candidates) {
    if (candidate && normalizeText(candidate.textContent ?? '').length >= MIN_CONTENT_CHARACTERS) {
      return candidate;
    }
  }
  return document.body ?? document.documentElement;
}

function collectLines(root: DomElement): string[] {
  const lines: string[] = [];
  const walk = (node: DomNode): void => {
    const element = asElement(node);
    if (!element) return;
    if (SKIP_TAGS.has(element.tagName) || element.getAttribute('role') === 'navigation' || element.tagName === 'NAV') {
      return;
    }
    if (element.tagName === 'TR') {
      const cells = Array.from(element.children).filter((child) => child.tagName === 'TD' || child.tagName === 'TH');
      const line = cells.map((cell) => inlineText(cell)).filter(Boolean).join(' | ');
      if (line) lines.push(line);
      return;
    }
    if (BLOCK_TAGS.has(element.tagName)) {
      const nested = Array.from(element.querySelectorAll(BLOCK_SELECTOR)).some((match) => match !== element);
      if (element.tagName === 'LI' && nested) {
        for (const child of Array.from(element.childNodes)) walk(child);
        return;
      }
      if (!nested) {
        const line = inlineText(element);
        if (line) lines.push(line);
        return;
      }
    }
    for (const child of Array.from(element.childNodes)) walk(child);
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  return lines;
}

function inlineText(element: DomElement): string {
  const parts: string[] = [];
  const walk = (node: DomNode): void => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? '');
      return;
    }
    const child = asElement(node);
    if (!child || SKIP_TAGS.has(child.tagName)) return;
    if (child.tagName === 'BR') {
      parts.push('\n');
      return;
    }
    for (const grandchild of Array.from(child.childNodes)) walk(grandchild);
  };
  for (const child of Array.from(element.childNodes)) walk(child);
  return normalizeText(parts.join(' ')).replace(/\n+/g, ' ');
}

function resolveFavicon(document: ParsedDocument, pageUrl: string): string | undefined {
  const selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];
  for (const selector of selectors) {
    const href = document.querySelector(selector)?.getAttribute('href');
    const resolved = resolveSafeUrl(href, pageUrl);
    if (resolved) return resolved;
  }
  return resolveSafeUrl('/favicon.ico', pageUrl);
}

function resolveSafeUrl(value: string | null | undefined, pageUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, pageUrl).toString();
    return validatePublicUrl(resolved).normalizedUrl;
  } catch {
    return undefined;
  }
}

function asElement(node: DomNode): DomElement | null {
  if (node.nodeType !== 1) return null;
  return node as DomElement;
}

function containsNode(parent: DomElement, child: DomElement): boolean {
  return Array.from(parent.querySelectorAll('*')).includes(child);
}
