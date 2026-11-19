import { describe, expect, it } from 'vitest';
import { MonitorError } from '@/utils/errors';
import { hostPermissionPattern, validatePublicUrl } from '@/utils/url-validator';

describe('URL validation', () => {
  it('accepts https and http addresses', () => {
    expect(validatePublicUrl('https://Example.com/jobs/').normalizedUrl).toBe('https://example.com/jobs');
    expect(validatePublicUrl('https://Example.com/jobs/').requestUrl).toBe('https://example.com/jobs/');
    expect(validatePublicUrl('http://example.com/notice').normalizedUrl).toBe('http://example.com/notice');
  });

  it('rejects unsupported protocols', () => {
    for (const url of ['chrome://settings', 'file:///tmp/page.html', 'javascript:alert(1)', 'chrome-extension://abc/page.html']) {
      expect(() => validatePublicUrl(url)).toThrow(MonitorError);
    }
  });

  it('rejects localhost and private-network addresses', () => {
    for (const url of [
      'http://localhost/results',
      'http://127.0.0.1/results',
      'http://10.0.0.8/results',
      'http://192.168.1.20/results',
      'http://172.16.0.4/results',
      'http://169.254.169.254/latest',
      'http://[::1]/results',
      'https://printer.local/status',
    ]) {
      expect(() => validatePublicUrl(url)).toThrowError(/private|local/i);
    }
  });

  it('rejects embedded credentials', () => {
    expect(() => validatePublicUrl('https://user:secret@example.com/jobs')).toThrow(/password/i);
  });

  it('builds a single-host permission pattern', () => {
    expect(hostPermissionPattern('https://example.com/jobs')).toBe('https://example.com/*');
  });

  it('treats a trailing slash as the same page', () => {
    expect(validatePublicUrl('https://example.com/jobs/').normalizedUrl).toBe(
      validatePublicUrl('https://example.com/jobs').normalizedUrl,
    );
  });
});
