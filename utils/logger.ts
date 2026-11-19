import { brand } from '@/config/brand';

type LogFields = Record<string, string | number | boolean | null>;

function write(level: 'info' | 'warn' | 'error', message: string, fields?: LogFields): void {
  const prefix = `[${brand.name}]`;
  if (fields) {
    console[level](prefix, message, fields);
    return;
  }
  console[level](prefix, message);
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    write('info', message, fields);
  },
  warn(message: string, fields?: LogFields): void {
    write('warn', message, fields);
  },
  error(message: string, fields?: LogFields): void {
    write('error', message, fields);
  },
};
