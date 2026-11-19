const INVISIBLE = new RegExp(`[${String.fromCharCode(0)}\\u200B-\\u200D\\uFEFF\\u2060]`, 'g');

export function normalizeInline(value: string): string {
  return value.replace(INVISIBLE, '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

/**
 * Collapses whitespace and drops blank lines so insignificant formatting
 * does not look like a content change.
 */
export function normalizeText(input: string): string {
  const lines = input
    .replace(INVISIBLE, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0);
  return lines.join('\n');
}
