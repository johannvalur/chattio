import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Visual comparison configuration
const visualComparisons = {
  threshold: 0.1,
  maxDiffPixelRatio: 0.01,
  maxDiffPixels: 0,
  fullPage: true,
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60 * 1000, // Increased timeout for visual tests
  expect: {
    timeout: 10 * 1000,
    toHaveScreenshot: {
      maxDiffPixelRatio: visualComparisons.maxDiffPixelRatio,
      maxDiffPixels: visualComparisons.maxDiffPixels,
    },
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit/results.xml' }],
  ],

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: BASE_URL,

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Video settings
    video: 'on-first-retry',

    // Trace settings
    trace: 'on-first-retry',

    // Viewport settings
    viewport: { width: 1280, height: 800 },
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server for development
  webServer: {
    command: `node ./scripts/serve-chattio.js ${PORT} chattio`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Increased timeout for server startup
    stderr: 'pipe',
    stdout: 'pipe',
  },

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),
});
