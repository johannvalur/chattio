import { test, expect } from '@playwright/test';
import { AppWindow } from './pages/appWindow';
import { PLATFORMS, THEMES, resetAppState } from './helpers/testHelpers';
import { expectScreenshotToMatch } from './helpers/visualTesting';

test.describe('Visual Regression Tests', () => {
  let app: AppWindow;

  test.beforeEach(async ({ page }) => {
    app = new AppWindow(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('should match welcome screen', async ({ page }) => {
    // Wait for the welcome screen to be fully loaded
    await page.waitForSelector('.welcome-screen', { state: 'visible' });
    
    // Take a screenshot and compare with the expected one
    await expectScreenshotToMatch(page, 'welcome-screen');
  });

  test('should match messenger tab', async ({ page }) => {
    // Navigate to the messenger tab
    await app.navigateToTab(PLATFORMS.MESSENGER);
    
    // Wait for the messenger tab to be fully loaded
    await page.waitForSelector(`#${PLATFORMS.MESSENGER}`, { state: 'visible' });
    
    // Take a screenshot and compare with the expected one
    await expectScreenshotToMatch(page, 'messenger-tab');
  });

  test('should match dark theme', async ({ page }) => {
    // Change to dark theme
    await app.changeTheme(THEMES.DARK);
    
    // Wait for the theme to be applied
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    });
    
    // Take a screenshot and compare with the expected one
    await expectScreenshotToMatch(page, 'dark-theme');
  });

  test('should show unread badge', async ({ page }) => {
    // Mock unread message
    await page.evaluate((platform) => {
      window.dispatchEvent(new CustomEvent('unread-update', {
        detail: { platform, count: 5 }
      }));
    }, PLATFORMS.MESSENGER);

    // Wait for the unread badge to appear
    await page.waitForSelector('.tablinks .unread-badge');
    
    // Take a screenshot and compare with the expected one
    await expectScreenshotToMatch(page, 'unread-badge');
  });

  test('should match settings panel', async ({ page }) => {
    // Open settings
    await app.openSettings();
    
    // Wait for settings to be visible
    await page.waitForSelector('.settings-panel', { state: 'visible' });
    
    // Take a screenshot and compare with the expected one
    await expectScreenshotToMatch(page, 'settings-panel');
  });
});
