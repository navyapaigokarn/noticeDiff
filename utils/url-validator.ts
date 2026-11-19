import { MonitorError } from '@/utils/errors';

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.localdomain', '.internal', '.home.arpa', '.lan'];

export interface ValidPublicUrl {
  url: URL;
  /** Identity used to detect duplicates. Trailing slashes are ignored. */
  normalizedUrl: string;
  /** Address to request. Trailing slashes are kept so directory pages are not redirected. */
  requestUrl: string;
  hostname: string;
}

export function hostPermissionPattern(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}/*`;
}

export function validatePublicUrl(input: string): ValidPublicUrl {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2_000) {
    throw new MonitorError('Enter a valid website address, including http:// or https://.', 'INVALID_URL');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new MonitorError('Enter a valid website address, including http:// or https://.', 'INVALID_URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new MonitorError(
      'Only public http and https pages can be monitored. Browser, file, and extension pages are not supported.',
      'UNSUPPORTED_PROTOCOL',
    );
  }

  if (url.username || url.password) {
    throw new MonitorError(
      'Remove the username and password from the address. NoticeDiff does not store credentials.',
      'INVALID_URL',
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || isBlockedHostname(hostname) || isPrivateAddress(hostname)) {
    throw new MonitorError(
      'NoticeDiff does not monitor localhost, private networks, or local addresses.',
      'PRIVATE_NETWORK',
    );
  }

  url.hash = '';
  url.hostname = hostname;
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  const requestUrl = url.toString();
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return {
    url,
    normalizedUrl: url.toString(),
    requestUrl,
    hostname,
  };
}

export function assertPublicUrl(input: string): ValidPublicUrl {
  return validatePublicUrl(input);
}

function isBlockedHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function isPrivateAddress(hostname: string): boolean {
  if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) return true;
  if (hostname.includes(':')) return isPrivateIpv6(hostname);
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return isPrivateIpv4(hostname);
  return false;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.some((part) => part.length > 1 && part.startsWith('0'))) return true;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = numbers;
  if (a === undefined || b === undefined) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (value === '::1' || value === '::') return true;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  return false;
}
