import { FullConfig, chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

async function globalSetup(config: FullConfig) {
  // Create test-results directory if it doesn't exist
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, 'actual'), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, 'expected'), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, 'diff'), { recursive: true });
  }

  // Launch browser to get the browser version
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Save browser version info
  const browserVersion = browser.version();
  await page.context().storageState({ path: 'test-results/storageState.json' });
  
  // Close the browser
  await browser.close();

  // Store browser version in environment variables
  process.env.BROWSER_VERSION = browserVersion;
  
  console.log('Global setup completed');
}

export default globalSetup;
