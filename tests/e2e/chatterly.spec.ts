import { test, expect } from '@playwright/test';

test.describe('Chattio marketing site', () => {
	test('renders hero section', async ({ page }) => {
		await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
		const hero = page.locator('.hero');
		await expect(hero).toContainText('All Your Chats');
		const slackItem = page.locator('.platform-item span').filter({ hasText: 'Slack' }).first();
		await expect(slackItem).toBeVisible();
	});
});

