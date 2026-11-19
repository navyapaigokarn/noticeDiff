export type CheckResult =
  | { status: 'baseline' }
  | { status: 'unchanged' }
  | { status: 'changed'; changeId: string; summary: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; message: string };
