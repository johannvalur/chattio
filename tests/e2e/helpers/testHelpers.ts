import { Page } from '@playwright/test';

export const PLATFORMS = {
  MESSENGER: 'messenger',
  SLACK: 'slack',
  DISCORD: 'discord',
  WHATSAPP: 'whatsapp'
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const;

export async function resetAppState(page: Page) {
  // Clear local storage
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  
  // Reload the page to apply default state
  await page.reload({ waitUntil: 'domcontentloaded' });
}

export async function mockNotificationPermission(
  page: Page, 
  permission: 'granted' | 'denied' | 'default' = 'granted'
) {
  await page.addInitScript(`
    window.Notification = {
      permission: '${permission}',
      requestPermission: () => Promise.resolve('${permission}')
    };
  `);
}
