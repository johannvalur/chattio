import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 30 * 1000,
	expect: {
		timeout: 5000
	},
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: {
		command: 'npx http-server chatterly -p 4173 -c-1',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 60 * 1000
	}
});

