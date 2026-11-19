/**
 * Product branding lives here so a rename does not require a sweep through the codebase.
 * The extension manifest, database name, and alarm name all read from this module.
 * Changing `databaseName` starts a fresh local database.
 */
export const brand = {
  name: 'NoticeDiff',
  description: 'NoticeDiff watches public web pages and tells you when their content changes.',
  tagline: 'Stop checking websites manually. NoticeDiff watches them for you.',
  headline: 'Your websites, always in the loop.',
  databaseName: 'NoticeDiff',
  alarmName: 'noticediff.scheduler',
  version: '0.1.0',
  monitoringLimitation:
    'NoticeDiff checks websites while Chrome is running on this computer. Monitoring pauses when Chrome is closed or the computer is off. A cloud scheduler is planned for a later release.',
} as const;
