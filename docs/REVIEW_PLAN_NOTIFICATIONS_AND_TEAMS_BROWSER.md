# Review Plan: Notification Logic & Teams External Browser on Launch

This document outlines a structured plan to review and fix (1) the notification logic across the app and (2) the issue where the app opens the external browser for Teams when the app launches.

---

## Part 1: Notification logic review

### 1.1 Map all notification-related code paths

| Location | What it does |
|---------|----------------|
| **`src/renderer.js`** | Defines `updateUnreadSummary()`, `sendNativeNotification()`, `setTabUnread()`, `isNotificationsEnabled()` (local), DND check `isDoNotDisturbActive()`, and calls from badge detection / title parsing. |
| **`src/modules/state/appState.js`** | Stores `appState.apps[platform].notifications`, `appState.settings.globalNotifications`, `badgeDockIcon`, `notificationSounds`, `notificationPreview`, DND settings. Exports `isNotificationsEnabled(platform)`. |
| **`src/modules/state/unreadState.js`** | Own `updateUnreadSummary()`, `sendNativeNotification()`, `setTabUnread()`, DND check, persistence to `chattio-unread-state`. Used by `tabs.js` for title-based unread. |
| **`src/main.js`** | Listens for `unread-summary` IPC and sets macOS dock badge (`app.dock.setBadge`). |

**Action:** Confirm which entry point the packaged app uses (renderer.js vs tabs.js). Index loads `renderer.js`; if `tabs.js` is used elsewhere, there are two separate notification/unread flows.

### 1.2 Clarify single source of truth

- **Unread counts:** Rendered in `renderer.js` from a local `unreadState` object; the same counts are also handled in `unreadState.js` with its own state and `setTabUnread`/`updateUnreadSummary`.
- **Notification permission:** Requested in `renderer.js` on DOMContentLoaded when `globalNotifications` is true and permission is `default`.
- **Per-app notifications:** Controlled by `appState.apps[platform].notifications`; toggles in Settings (e.g. `data-toggle="notifications"`) update this and call `updateUnreadSummary()`.

**Action:** Decide whether unread state and notification summary updates live only in `renderer.js` or only in `unreadState.js`, and remove or refactor the duplicate path so there is one clear flow from unread → badge + native notification.

### 1.3 Notification flow checklist

- [ ] **Global vs per-app:** When `globalNotifications` is off, native notifications and dock badge should not fire; when on, only platforms with `appState.apps[platform].notifications !== false` should contribute. Verify both `renderer.js` and `unreadState.js` use the same conditions.
- [ ] **DND:** Confirm DND (manual + schedule) is applied in the same place that sends native notifications (and that `unreadState.js` and `renderer.js` don’t disagree).
- [ ] **Cooldown:** `NOTIFICATION_COOLDOWN` (5s) and `lastNotificationSnapshot` / `lastNotificationTime` exist in both renderer and unreadState; ensure only one implementation is active and consistent.
- [ ] **Badge dock icon:** When `badgeDockIcon` is false, `unread-summary` should send `totalMessages: 0` so the dock badge is cleared. Confirm in the code path that actually runs.
- [ ] **Preview / sound:** `notificationPreview` and `notificationSounds` should be read from `appState.settings` in the same place that creates `new Notification(...)`.

### 1.4 Tests and docs

- **Unit:** `tests/unit/state/appState.test.js` covers `isNotificationsEnabled`. Add or extend tests for notification summary conditions (global + per-app + DND).
- **E2E:** `tests/e2e/pages/appWindow.ts` has `toggleNotifications`. Consider adding a scenario that asserts no native notification when global or per-app notifications are off.
- **Docs:** `docs/MESSENGER_BADGE_DETECTION.md` describes badge detection; ensure it’s clear how badge counts feed into `setTabUnread` → `updateUnreadSummary` → native notification in the chosen single flow.

---

## Part 2: Teams opening external browser on launch

### 2.1 Root cause hypothesis

- On load, **all platform webviews are created with `src` set** in `renderer.js` → `renderPlatformTabs()` → `createPlatformTab()` (each `webview.src = config.url`). So all 9 platforms (including Teams) start loading as soon as the DOM is ready, even though the **welcome** tab is shown first.
- For every webview, **`new-window`** is handled by opening the URL in the **external browser** (no filtering):
  - **`src/renderer.js`:** `webview.addEventListener('new-window', ...)` → `openExternalLink(event.url)`.
  - **`src/modules/webviews/webviewManager.js`:** `new-window` → `ipcRenderer.send('open-external', e.url)`.
  - **`src/modules/ui/tabs.js`:** Same pattern.
- **`will-navigate`** is filtered: only URLs whose host is not “internal” (e.g. for Teams, `teams.microsoft.com` + Microsoft auth domains) open externally. So main-frame navigations to login.microsoftonline.com stay in-webview.
- **Teams** can open a **popup** (e.g. SSO, “Open in desktop app”, or “Use web instead”) during initial load. That triggers **`new-window`**, which is always sent to the OS default browser. So the external browser opens as soon as Teams’ tab loads in the background.

### 2.2 Code locations to review

| File | Relevant behavior |
|------|-------------------|
| **`src/main.js`** | `setWindowOpenHandler` (lines 156–165): any `window.open` from the **main** window’s webContents opens in external browser. Usually this is for the renderer UI, not the webview; webview `new-window` is handled inside the renderer. |
| **`src/main.js`** | `ipcMain.on('open-external', ...)` (lines 404–410): opens the given URL in the default browser. |
| **`src/renderer.js`** | `createPlatformTab()`: sets `webview.src = config.url` for every platform → all webviews load on startup. |
| **`src/renderer.js`** | `new-window` handler (lines 487–494): no URL filtering; always `openExternalLink(event.url)`. |
| **`src/renderer.js`** | `will-navigate` (lines 497–516): uses `getPlatformHost()` and `isInternalHost()`; for Teams, Microsoft auth hosts are internal. |
| **`src/modules/webviews/webviewManager.js`** | `new-window` (124–129) and `will-navigate` (132–154): same idea — `will-navigate` uses internal host list; `new-window` always sends to `open-external`. |

### 2.3 Recommended changes (to validate during review)

1. **Option A – Lazy-load webviews**  
   Do not set `webview.src` in `createPlatformTab()`. Set `src` only when the user switches to that tab (e.g. in `openTab()` or when the tab becomes visible). Then Teams (and others) only load when the user opens that tab, reducing the chance of an automatic popup on launch. Confirm no regressions for other platforms.

2. **Option B – Filter `new-window` by URL**  
   In the `new-window` handler (renderer and, if used, webviewManager/tabs), parse `event.url`. If the URL is “internal” for that platform (e.g. for Teams: `teams.microsoft.com`, `login.microsoftonline.com`, etc.), **do not** call `openExternalLink`; either allow the default behavior (if possible in webview) or ignore. Only open externally when the URL is clearly external (e.g. different product or marketing site). This prevents SSO/auth popups from opening the browser while still opening real external links there.

3. **Option C – Combine**  
   Lazy-load webviews (A) and add URL filtering for `new-window` (B) so that even when the user opens Teams later, auth popups stay in-app where possible.

### 2.4 Verification steps

- [ ] Reproduce: Launch app with a clean profile; ensure Teams is one of the loaded tabs (or restore state so Teams was last used). Observe whether the external browser opens without user action.
- [ ] Add temporary logging in the `new-window` handler: log `platform` and `event.url`. Reproduce and confirm that the URL is Teams/Microsoft (e.g. login or redirect) and that it happens during initial load.
- [ ] After implementing a fix: Launch with welcome tab; switch to Teams; use a link that should open in browser. Confirm external links still open in the OS browser and that auth flows still work inside the webview.

---

## Part 3: Implementation order

1. **Notification logic**  
   - Unify unread/notification flow (single source of truth: either renderer or unreadState module).  
   - Apply the checklist in 1.3 and add/update tests and docs as in 1.4.

2. **Teams external browser**  
   - Confirm root cause with logging (2.4).  
   - Implement Option A and/or B/C.  
   - Re-test launch and Teams auth + external links.

3. **Regression**  
   - Full pass: launch, switch platforms, trigger unread counts, toggle notifications and DND, and open external links from multiple platforms (including Teams) to ensure nothing else opens the browser unexpectedly.

---

## Quick reference: key files

- **Notifications / unread:** `src/renderer.js` (top: updateUnreadSummary, sendNativeNotification, setTabUnread; DND; settings toggles), `src/modules/state/appState.js`, `src/modules/state/unreadState.js`, `src/main.js` (unread-summary).
- **External browser / Teams:** `src/renderer.js` (createPlatformTab, new-window, will-navigate, openExternalLink), `src/modules/webviews/webviewManager.js` (new-window, will-navigate, isInternalHost), `src/main.js` (open-external, setWindowOpenHandler).
