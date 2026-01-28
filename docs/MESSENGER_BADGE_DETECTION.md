# Facebook Messenger Badge Detection

## Overview

The Facebook Messenger notification badge detection system uses a multi-layered approach with 5 different detection methods, each serving as a fallback for the previous method. This ensures robust unread message counting even as Facebook's DOM structure changes.

## Detection Methods

The system attempts detection methods in order of reliability and specificity:

### 1. Badge Element (Primary) - `badge_element`
**Selectors:**
- `[data-testid="mwthreadlist_unread_badge_count"]`
- `[data-testid="unread_indicator_badge"]`

**Description:** Direct badge count element that Facebook displays in the UI. This is the most reliable method as it reflects the actual count Facebook shows to users.

**Handles:**
- Numeric counts (e.g., "5")
- High count format (e.g., "99+")

### 2. Unread Badges - `unread_badges`
**Selectors:**
- `[data-testid="mwthreadlist_row_unread_indicator"]`
- `[aria-label*="unread" i]:not([role="row"])`
- `.notranslate > span[style*="background"]`

**Description:** Counts individual unread indicator badges displayed next to conversation threads. Excludes row elements to avoid double-counting.

### 3. Unread Rows - `unread_rows`
**Selectors:**
- `[role="row"]`
- `[data-testid="mwthreadlist-row"]`

**Filter:** Checks `aria-label` for "unread" or "new message" (case-insensitive)

**Description:** Counts conversation rows marked as unread via accessibility labels.

### 4. Unread Dots - `unread_dots`
**Selectors:**
- `[aria-label="Unread"]`
- `[aria-label="Unread dot"]`
- `[aria-label="Mark as read"]`

**Description:** Counts individual unread indicator dots by their accessibility labels.

### 5. Navigation Badge - `nav_badge`
**Selectors:**
- `[data-testid="navigation_badge"]`

**Description:** Fallback for mobile or alternative views where the main thread list might not be visible.

**Handles:**
- Numeric counts
- High count format ("99+")

## Telemetry

All badge detection attempts are tracked via telemetry with the following data:
- Platform (always "messenger")
- Detection method used
- Count detected
- Error details (if applicable)

### Telemetry Statistics

The telemetry system provides:
- **Total detections:** Count of all badge detection attempts
- **By platform:** Breakdown per messaging platform
- **By method:** Which detection methods are succeeding
- **Success rate:** Percentage of successful detections (excludes errors/exceptions)

## Error Handling

The detection system includes comprehensive error handling:

1. **Method-level try-catch:** Each detection attempt is wrapped in error handling
2. **Graceful degradation:** Falls through to next method on failure
3. **Error tracking:** Logs and tracks detection failures via telemetry
4. **Exception handling:** Catches JavaScript execution errors in the webview

### Error Types
- `error`: Detection logic error
- `exception`: JavaScript execution error
- `failed`: All methods failed
- `none`: No unread messages (not an error)

## Polling Behavior

- **Interval:** 4 seconds
- **Initial poll:** 2 seconds after webview loads
- **Lifecycle:** Automatically stops when webview is destroyed or closed

## Testing

Comprehensive test coverage in `tests/unit/messengerBadgeDetection.test.js`:

- ✅ All 5 detection methods
- ✅ Fallback behavior and priority
- ✅ Edge cases (invalid input, whitespace, large counts)
- ✅ Real-world scenarios (typical thread list structures)
- ✅ 99+ format handling
- ✅ Case-insensitive matching
- ✅ Empty/missing states

**Test Results:** 27 tests, all passing

## Implementation Details

### Location
- Main implementation: `src/renderer.js:664-766`
- Telemetry tracking: `src/lib/telemetry.js`
- Tests: `tests/unit/messengerBadgeDetection.test.js`

### Code Flow

```javascript
pollMessengerUnread()
  ↓
executeJavaScript() in webview
  ↓
Try Method 1: Badge Element
  ├─ Success → return { count, detectionMethod: 'badge_element' }
  └─ Fail → Try Method 2: Unread Badges
       ├─ Success → return { count, detectionMethod: 'unread_badges' }
       └─ Fail → Try Method 3: Unread Rows
            ├─ Success → return { count, detectionMethod: 'unread_rows' }
            └─ Fail → Try Method 4: Unread Dots
                 ├─ Success → return { count, detectionMethod: 'unread_dots' }
                 └─ Fail → Try Method 5: Navigation Badge
                      ├─ Success → return { count, detectionMethod: 'nav_badge' }
                      └─ Fail → return { count: 0, detectionMethod: 'none' }
  ↓
Track via telemetry.trackBadgeDetection()
  ↓
Update UI via setTabUnread()
```

## Maintenance

### When Facebook Changes Their DOM

If badge detection stops working:

1. **Check telemetry:** Look at which detection methods are being used
2. **Inspect Facebook's DOM:** Use browser DevTools on messenger.com
3. **Update selectors:** Add new selectors to the appropriate method
4. **Add new method:** If needed, insert a new detection method in the priority order
5. **Test:** Run `npm test tests/unit/messengerBadgeDetection.test.js`
6. **Monitor:** Use telemetry to verify the new method is working in production

### Common Issues

**Issue:** Badge count always shows 0
- **Cause:** Facebook changed primary badge element
- **Solution:** Update Method 1 selectors

**Issue:** Count is lower than expected
- **Cause:** Some unread indicators not being detected
- **Solution:** Add additional selectors to Method 2 or 3

**Issue:** Count is higher than expected
- **Cause:** Double-counting (e.g., counting both badge and rows)
- **Solution:** Adjust method priority or add exclusion filters

## Performance

- **Polling frequency:** Every 4 seconds (low overhead)
- **Execution time:** ~10-50ms per poll (varies by DOM size)
- **Memory impact:** Minimal (no persistent DOM references)
- **Network impact:** None (all detection happens client-side)

## Future Improvements

Potential enhancements:
1. **Adaptive polling:** Increase frequency when user is active, decrease when idle
2. **Mutation observers:** React to DOM changes instead of polling
3. **Machine learning:** Learn which selectors are most reliable over time
4. **User feedback:** Allow users to report incorrect counts
5. **A/B testing:** Test new detection methods before rolling out

## Related Documentation

- [Notification System](../ARCHITECTURE.md#notification-system)
- [Telemetry](../ARCHITECTURE.md#telemetry)
- [Testing Strategy](../TESTING.md)
