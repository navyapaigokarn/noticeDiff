export const MONITOR_ERROR_CODES = [
  'INVALID_URL',
  'UNSUPPORTED_PROTOCOL',
  'PRIVATE_NETWORK',
  'DUPLICATE',
  'PERMISSION_DENIED',
  'NETWORK',
  'TIMEOUT',
  'HTTP_ERROR',
  'RATE_LIMITED',
  'CAPTCHA',
  'UNSUPPORTED_TYPE',
  'EMPTY_PAGE',
  'TOO_LARGE',
  'PARSE',
  'NOT_FOUND',
  'WORKER',
  'INTERNAL',
] as const;

export type MonitorErrorCode = (typeof MONITOR_ERROR_CODES)[number];

export class MonitorError extends Error {
  readonly code: MonitorErrorCode;
  readonly retryAfterMs?: number;

  constructor(message: string, code: MonitorErrorCode, options?: { retryAfterMs?: number }) {
    super(message);
    this.name = 'MonitorError';
    this.code = code;
    if (options?.retryAfterMs !== undefined) {
      this.retryAfterMs = options.retryAfterMs;
    }
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof MonitorError) return error.message;
  return 'Something went wrong while monitoring this website. Please try again.';
}
