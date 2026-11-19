import { chromium, expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

test('dashboard opens from the built extension', async () => {
  test.skip(!existsSync(path.join(extensionPath, 'manifest.json')), 'Run npm run build before browser tests.');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const background = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 15_000 }));
  const extensionId = new URL(background.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(page.getByRole('heading', { name: /always in the loop/i })).toBeVisible();
  await expect(page.getByText(/Chrome is closed or the computer is off/i)).toBeVisible();

  await page.getByRole('link', { name: 'All Websites' }).click();
  await expect(page.getByRole('heading', { name: 'No websites yet' })).toBeVisible();

  await page.getByRole('button', { name: 'Add website' }).first().click();
  await page.getByLabel('Website address').fill('http://127.0.0.1/secret');
  await page.getByRole('button', { name: 'Start monitoring' }).click();
  await expect(page.getByRole('alert')).toContainText(/private|local/i);

  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  const notifications = page.getByRole('checkbox');
  await expect(notifications).toBeChecked();
  await notifications.uncheck();
  await expect(notifications).not.toBeChecked();

  await page.getByRole('link', { name: 'About', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /About NoticeDiff/i })).toBeVisible();
  await page.getByRole('link', { name: 'Privacy policy' }).first().click();
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await context.close();
});
