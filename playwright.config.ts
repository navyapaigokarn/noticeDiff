import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    headless: false,
  },
});
