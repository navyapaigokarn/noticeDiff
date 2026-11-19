import type { CheckResult } from '@/types/check.types';

export function describeCheck(result: CheckResult): string {
  switch (result.status) {
    case 'unchanged':
      return 'No change since the last check.';
    case 'changed':
      return result.summary;
    case 'baseline':
      return 'A baseline was saved for this website.';
    case 'skipped':
      return result.reason;
    case 'failed':
      return result.message;
  }
}
