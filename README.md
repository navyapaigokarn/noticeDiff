# NoticeDiff

NoticeDiff is a local-first Chrome extension that watches public web pages and tells you when their meaningful text changes.

Stop checking websites manually. NoticeDiff watches them for you.

This version runs entirely in the browser. It does not include accounts, payments, or a cloud scheduler. Checks happen only while Chrome is running on this computer.

## Stack

- Chrome Extension Manifest V3, built with WXT and Vite
- React 19 and TypeScript
- Tailwind CSS v4 and a small shadcn-style component set
- Dexie and IndexedDB for monitors, snapshots, and change history
- Chrome storage for preferences
- jsdiff for comparisons and Web Crypto SHA-256 for content hashes
- linkedom for HTML extraction in the service worker

TypeScript 6.0.3 is used because the current typescript-eslint release does not support TypeScript 7 yet. Product names, the database name, and the scheduler alarm name live in `config/brand.ts`.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run compile
npm run lint
```

`npm run dev` opens a Chrome instance with the extension loaded. `npm run build` writes a production extension to `.output/chrome-mv3`.

Browser-level coverage is in `tests/e2e/dashboard.spec.ts`:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

The end-to-end test launches Chromium with the built extension. It needs a local display.

## Load the extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Choose Load unpacked.
5. Select the `.output/chrome-mv3` folder.

Pin NoticeDiff, open a public HTML page, and click **Monitor This Page**. Chrome will ask for permission for that site only. The first successful read becomes the baseline and does not send a change notification.

## How monitoring works

The popup and dashboard never fetch pages themselves. They ask the service worker to do it, so a check can finish after the popup closes.

1. The address is checked. Only `http` and `https` public hosts are accepted. Localhost, private networks, link-local addresses, and credential-bearing URLs are rejected.
2. Chrome’s optional host permission is requested for that origin. The extension does not ask for access to every website at install time.
3. The service worker downloads the public HTML with `credentials: "omit"`, follows redirects manually, and rejects any hop that is not a public HTTP address.
4. Scripts, styles, and navigation are removed. Headings, paragraphs, lists, tables, and footer announcements are kept. Text is normalized and hashed.
5. A later check compares hashes first. Identical hashes skip the diff. A real difference is stored as a snapshot and a change, then a Chrome notification is shown if notifications are enabled.
6. A failed request, HTTP error, challenge page, or unsupported file type updates the error state and does not replace the last good snapshot.

One Chrome alarm fires every 30 minutes and checks websites whose saved `nextCheckAt` time has passed. Frequencies are 1 hour, 6 hours, and 24 hours. The alarm is recreated when the extension is installed and when Chrome starts. “Check now” runs immediately.

There is no permanently injected content script. Reading the active tab uses the scripting API after you choose to monitor that page, which avoids requesting access to all sites.

## Project layout

```
config/            Product name and monitoring limits
entrypoints/       Popup, dashboard, and service worker
components/        Layout, dashboard, history, and shared UI
services/          Fetch, extraction, diff, scheduling, and monitor orchestration
database/          Dexie schema, repositories, and retention
hooks/             Live queries, settings, and monitor actions
types/             Shared entity and message types
utils/             URL checks, hashing, normalization
tests/             Unit fixtures and a Playwright extension smoke test
public/            Toolbar icons
```

## Privacy

Monitored pages, snapshots, and settings stay in this browser profile. See `PRIVACY.md` and the Privacy page inside the dashboard. Page text is not sent to an analytics or AI service.

## Known limitations

- Monitoring pauses when Chrome is closed or the computer is off.
- JavaScript-rendered pages may be incomplete because checks use the HTTP response, not a live browser tab. The same method is used for the baseline and later checks so a different renderer does not look like an edit.
- PDF monitoring is not supported.
- Sign-in walls, CAPTCHA pages, and access-denied responses are reported as errors.
- Normalized text is capped at 500,000 characters. Larger pages are truncated consistently.
- When Chrome hides a redirect destination, NoticeDiff follows it and keeps the page only if the final address is still a public HTTP page. A redirect onto a private network is discarded.

## Phase 2

A future backend can add always-on checks, accounts, cross-device sync, and subscriptions. The intended services are NestJS, PostgreSQL, Redis, and BullMQ. This release keeps fetch, diff, storage, and scheduling in separate modules so that work can move server-side without rewriting the comparison engine.
