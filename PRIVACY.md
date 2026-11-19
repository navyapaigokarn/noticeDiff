# NoticeDiff privacy policy

This policy describes NoticeDiff version 0.1.0, the local Chrome extension. It matches what this version actually does.

## What is stored on this device

When you add a website, NoticeDiff stores:

- the page address, title, and hostname
- an optional favicon address found on that page
- the extracted text and its SHA-256 hash
- check times, status, and the last error, if a check failed
- change summaries, including added text, removed text, and modified lines

These records are kept in IndexedDB in the extension’s browser profile. Preferences, including the default frequency, notification toggle, and history retention, are kept in `chrome.storage.local`.

There is no NoticeDiff account and no NoticeDiff server in this version, so this data is not uploaded to one.

## What the extension accesses

- The address and title of the active tab, only when you choose Monitor This Page or otherwise add a page.
- Permission to read a specific website, requested when you add that website. Installation does not grant access to all websites.
- Public HTML from websites you asked to monitor.

NoticeDiff does not collect browsing history, passwords, cookies, or authentication tokens.

## What leaves the device

To perform a check, NoticeDiff requests the public page directly from that website. The request omits credentials and does not send a cookie jar. Redirects to localhost, private networks, and local addresses are rejected.

Page text is not sent to an analytics service or an external AI service. Desktop notifications are created locally by Chrome.

The dashboard may load a favicon image from the monitored site so the list can show that site’s icon.

## What you can delete

You can delete one website and its history, clear older snapshots, or erase all monitoring data from Settings. Preferences are kept when monitoring data is cleared. Removing the extension removes its local storage.

## Monitoring limit

Checks run only while Chrome is open on this computer. They do not run when Chrome is closed or the computer is off.
