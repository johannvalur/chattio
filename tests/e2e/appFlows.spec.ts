import { test, expect } from '@playwright/test';
import { AppWindow } from './pages/appWindow';
import { PLATFORMS, THEMES, resetAppState, mockNotificationPermission } from './helpers/testHelpers';

test.describe('Chattio Application Flows', () => {
  let app: AppWindow;

  test.beforeEach(async ({ page }) => {
    // Set up the app window and mock notification permissions
    app = new AppWindow(page);
    await mockNotificationPermission(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({ page }) => {
    // Reset app state after each test
    await resetAppState(page);
  });

  test('should load with default tab active', async ({ page }) => {
    // Verify the default tab is active
    await expect(page.locator('.tablinks[data-platform="welcome"].active')).toBeVisible();
    await expect(await app.getActiveTabContent()).toHaveAttribute('id', 'welcome');
  });

  test('should switch between platform tabs', async ({ page }) => {
    // Test switching to Messenger
    await app.navigateToTab(PLATFORMS.MESSENGER);
    await expect(await app.getActiveTabContent()).toHaveAttribute('id', PLATFORMS.MESSENGER);

    // Test switching to Slack
    await app.navigateToTab(PLATFORMS.SLACK);
    await expect(await app.getActiveTabContent()).toHaveAttribute('id', PLATFORMS.SLACK);
  });

  test('should update unread message counts', async ({ page }) => {
    // Mock unread messages for Messenger
    await page.evaluate((platform) => {
      window.dispatchEvent(new CustomEvent('unread-update', {
        detail: { platform, count: 3 }
      }));
    }, PLATFORMS.MESSENGER);

    // Verify the unread badge is displayed
    await app.waitForUnreadCount(PLATFORMS.MESSENGER, 3);
    
    // Clear unread messages by clicking the tab
    await app.navigateToTab(PLATFORMS.MESSENGER);
    await app.waitForUnreadCount(PLATFORMS.MESSENGER, 0);
  });

  test('should change theme', async ({ page }) => {
    // Change to dark theme
    await app.changeTheme(THEMES.DARK);
    
    // Verify the theme is applied
    const isDark = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
    expect(isDark).toBeTruthy();

    // Change back to light theme
    await app.changeTheme(THEMES.LIGHT);
    
    // Verify the theme is applied
    const isLight = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme') === 'light'
    );
    expect(isLight).toBeTruthy();
  });

  test('should toggle notifications', async ({ page }) => {
    // Disable notifications
    await app.toggleNotifications(false);
    
    // Mock unread message and verify no notification is shown
    const notificationPromise = page.waitForEvent('console', {
      predicate: msg => msg.text().includes('Notification:')
    }).catch(() => null);
    
    await page.evaluate((platform) => {
      window.dispatchEvent(new CustomEvent('unread-update', {
        detail: { platform, count: 1 }
      }));
    }, PLATFORMS.MESSENGER);

    // Wait a moment for any potential notifications
    await page.waitForTimeout(1000);
    
    // If notification was shown, this would reject the promise
    const notification = await notificationPromise;
    expect(notification).toBeNull();
  });

  test('should persist settings across page reloads', async ({ page }) => {
    // Change a setting
    await app.changeTheme(THEMES.DARK);
    
    // Reload the page
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // Verify the setting is still applied
    const isDark = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
    expect(isDark).toBeTruthy();
  });

  test('should handle multiple platforms with unread messages', async ({ page }) => {
    // Set up unread messages for multiple platforms
    await page.evaluate(({ messenger, slack }) => {
      window.dispatchEvent(new CustomEvent('unread-update', {
        detail: { platform: messenger, count: 2 }
      }));
      window.dispatchEvent(new CustomEvent('unread-update', {
        detail: { platform: slack, count: 1 }
      }));
    }, { messenger: PLATFORMS.MESSENGER, slack: PLATFORMS.SLACK });

    // Verify both platforms show unread badges
    await app.waitForUnreadCount(PLATFORMS.MESSENGER, 2);
    await app.waitForUnreadCount(PLATFORMS.SLACK, 1);

    // Clear one platform and verify the other is unaffected
    await app.navigateToTab(PLATFORMS.MESSENGER);
    await app.waitForUnreadCount(PLATFORMS.MESSENGER, 0);
    await app.waitForUnreadCount(PLATFORMS.SLACK, 1);
  });
});
