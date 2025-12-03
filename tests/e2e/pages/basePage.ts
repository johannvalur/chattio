import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForTimeout(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  async waitForSelector(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' });
  }

  async getText(selector: string): Promise<string> {
    await this.waitForSelector(selector);
    return this.page.locator(selector).innerText();
  }

  async click(selector: string) {
    await this.waitForSelector(selector);
    await this.page.click(selector);
  }

  async fill(selector: string, text: string) {
    await this.waitForSelector(selector);
    await this.page.fill(selector, text);
  }
}
