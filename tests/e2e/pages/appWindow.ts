import { Page } from '@playwright/test';
import { BasePage } from './basePage';

export class AppWindow extends BasePage {
  // Sidebar selectors
  private readonly sidebarSelector = '.sidebar';
  private readonly tabButtonSelector = (platform: string) => `.tablinks[data-platform="${platform}"]`;
  private readonly activeTabContentSelector = '.tabcontent.active';
  private readonly settingsButtonSelector = '[data-testid="settings-button"]';
  
  // Settings selectors
  private readonly themeSelector = '[data-testid="theme-selector"]';
  private readonly notificationToggleSelector = '[data-testid="notifications-toggle"]';
  private readonly saveSettingsButton = '[data-testid="save-settings"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToTab(platform: string) {
    await this.click(this.tabButtonSelector(platform));
    await this.page.waitForSelector(`${this.tabButtonSelector(platform)}.active`);
  }

  async getActiveTabContent() {
    return this.page.locator(this.activeTabContentSelector);
  }

  async openSettings() {
    await this.click(this.settingsButtonSelector);
    await this.page.waitForSelector(this.themeSelector);
  }

  async changeTheme(theme: string) {
    await this.openSettings();
    await this.page.selectOption(this.themeSelector, theme);
    await this.click(this.saveSettingsButton);
  }

  async toggleNotifications(enable: boolean) {
    await this.openSettings();
    const isChecked = await this.page.isChecked(this.notificationToggleSelector);
    if (isChecked !== enable) {
      await this.click(this.notificationToggleSelector);
      await this.click(this.saveSettingsButton);
    }
  }

  async getUnreadCount(platform: string): Promise<number> {
    const badge = this.page.locator(`${this.tabButtonSelector(platform)} .unread-badge`);
    const count = await badge.innerText().catch(() => '0');
    return parseInt(count, 10) || 0;
  }

  async waitForUnreadCount(platform: string, expectedCount: number, timeout = 5000) {
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const badge = document.querySelector(selector + ' .unread-badge');
        const count = badge ? parseInt(badge.textContent || '0', 10) : 0;
        return count === expected;
      },
      { selector: this.tabButtonSelector(platform), expected: expectedCount },
      { timeout }
    );
  }
}
