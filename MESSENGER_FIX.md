# Facebook Messenger Loading Fix

## Summary

Fixed the Facebook Messenger loading issue by implementing proper loading indicators and state management for all webviews in Chattio.

## Changes Made

### 1. **Added Loading Indicators** (src/renderer.js)

- Created a visual loading spinner that overlays the webview
- Shows "Loading [Platform]..." text during initial load
- Uses absolute positioning to appear on top of webview

### 2. **Fixed Webview Visibility** (src/renderer.js:350-367)

- Removed `display: none` from webview initial state
- Webviews now load in the background while loading indicator is visible
- This ensures webviews can start loading immediately

### 3. **Enhanced Loading State Management** (src/renderer.js:470-520)

- Added `did-start-loading` event listener with 30-second timeout protection
- Added `did-stop-loading` event listener to hide loading indicator
- Special Messenger handling: Hides loading indicator 2 seconds after `dom-ready`
- Added debug console logs for easier troubleshooting

### 4. **Updated CSS** (src/styles.css:2431-2445)

- Made loading indicator absolutely positioned with z-index: 1000
- Added full-screen background colors (white for light theme, dark for dark theme)
- Ensured loading indicator covers the entire webview area

### 5. **Improved Error Handling** (src/renderer.js:775-802)

- Clears loading indicators when errors occur
- Logs platform-specific error messages
- Handles Messenger auth redirects (ERR_ABORTED) gracefully

## Files Modified

- `src/renderer.js` - Loading logic and event handlers
- `src/styles.css` - Loading indicator styling

## Testing Instructions

### 1. Clean Start

```bash
# Kill any running instances
pkill -f "electron.*chattio"
pkill -f "npm run dev"

# Clear lock files (if needed)
rm -rf "/Users/johannvs/Library/Application Support/chattio/Partitions/messenger/File System/Origins/LOCK"

# Start fresh
npm run dev
```

### 2. What to Look For

When you click on the Messenger tab, you should see:

1. **Loading Spinner** - A blue animated spinner with "Loading Messenger..." text
2. **Spinner Disappears** - After 2-30 seconds, the spinner disappears and Messenger appears
3. **Console Logs** (in terminal or DevTools):
   ```
   [DEBUG] messenger webview started loading
   [DEBUG] messenger DOM ready
   [DEBUG] messenger DOM ready - will hide spinner in 2s
   [DEBUG] messenger loading indicator hidden after timeout
   ```

### 3. Common Issues & Solutions

#### Issue: "File currently in use" errors

**Solution:**

```bash
pkill -9 -f "electron"
rm -rf "/Users/johannvs/Library/Application Support/chattio/Partitions/*/File System/Origins/LOCK"
rm -rf "/Users/johannvs/Library/Application Support/chattio/Partitions/*/IndexedDB/*/LOCK"
```

#### Issue: Messenger shows blank screen

**Check:**

- Open DevTools (should open automatically in dev mode)
- Look at the Console tab for errors
- Check Network tab to see if messenger.com is loading
- Verify the loading indicator is showing/hiding properly

#### Issue: Loading spinner never disappears

**Possible causes:**

- `did-stop-loading` event not firing
- Messenger getting stuck in auth redirect loop
- Network connectivity issues

**Debug steps:**

1. Check console for `[DEBUG]` messages
2. Look for navigation errors in DevTools
3. Check if `dom-ready` event fires (should trigger 2-second fallback)

### 4. Using DevTools

When running `npm run dev`, DevTools should open automatically. You can:

- Check Console for debug messages and errors
- Use Network tab to see what's loading
- Use Elements tab to inspect the webview and loading indicator
- Use Application tab to check localStorage/cookies

### 5. Testing Notifications & File Dropping

Once Messenger loads properly:

**Notifications:**

- Send yourself a message from another device
- Should see a notification and unread badge in sidebar
- Notification polling runs every 4 seconds

**File Dropping:**

- Drag and drop a file into Messenger
- Should upload normally
- External links should open in your default browser

**Link Handling:**

- Click on any external link in Messenger
- Should open in default browser, not in Chattio

## Technical Details

### Loading Flow

1. User clicks Messenger tab
2. Webview starts loading in background
3. Loading indicator shows on top
4. Events fire in sequence:
   - `did-start-loading` → starts 30s timeout
   - `dom-ready` → triggers 2s Messenger-specific timeout
   - `did-stop-loading` → hides loading indicator
5. If 2s passes after `dom-ready`, loading indicator is hidden automatically

### Why This Works

- **Visibility**: Webviews must be in the DOM and not `display: none` to load properly
- **Overlay**: Loading indicator uses absolute positioning to appear on top
- **Fallback**: Multiple timeout mechanisms ensure spinner doesn't stick around forever
- **Messenger-specific**: 2-second aggressive timeout after DOM ready handles Facebook's complex auth flow

## Known Issues

### Database Lock Errors

You may see errors like:

```
SandboxOriginDatabase failed... File System/Origins/LOCK: File currently in use
```

These are harmless if they appear briefly during startup. If they persist, clear lock files as shown above.

### Multiple Renderer Processes

Chattio creates one renderer process per platform webview. This is normal and expected.

## Debugging Commands

```bash
# Watch console logs in real-time
npm run dev 2>&1 | grep -E "\[DEBUG\]|messenger|ERROR"

# Check if Electron is running
ps aux | grep electron | grep chattio

# Clear all Chattio data (nuclear option)
rm -rf "/Users/johannvs/Library/Application Support/chattio"
```

## Next Steps

If Messenger still doesn't work:

1. Check if you can access https://www.messenger.com/ in a regular browser
2. Verify your internet connection
3. Check if Facebook is blocking the Chattio user agent
4. Look for specific error messages in DevTools Console
5. Check DevTools Network tab for failed requests

## Support

If issues persist, provide:

- Console output with `[DEBUG]` messages
- DevTools Console errors
- DevTools Network tab screenshot
- Description of what you see (blank screen, loading forever, error message, etc.)
