import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as pngjs from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createHash } from 'crypto';

const SCREENSHOTS_BASE_DIR = path.join(__dirname, '../../screenshots');
const SCREENSHOTS_ACTUAL_DIR = path.join(SCREENSHOTS_BASE_DIR, 'actual');
const SCREENSHOTS_EXPECTED_DIR = path.join(SCREENSHOTS_BASE_DIR, 'expected');
const SCREENSHOTS_DIFF_DIR = path.join(SCREENSHOTS_BASE_DIR, 'diff');

// Create directories if they don't exist
[SCREENSHOTS_ACTUAL_DIR, SCREENSHOTS_EXPECTED_DIR, SCREENSHOTS_DIFF_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export async function takeScreenshot(page: Page, name: string) {
  const screenshotPath = path.join(SCREENSHOTS_ACTUAL_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function compareScreenshot(page: Page, name: string, threshold = 0.1) {
  const expectedPath = path.join(SCREENSHOTS_EXPECTED_DIR, `${name}.png`);
  const actualPath = path.join(SCREENSHOTS_ACTUAL_DIR, `${name}.png`);
  const diffPath = path.join(SCREENSHOTS_DIFF_DIR, `${name}-diff.png`);
  
  // Ensure the actual directory exists
  if (!fs.existsSync(path.dirname(actualPath))) {
    fs.mkdirSync(path.dirname(actualPath), { recursive: true });
  }

  // Take the actual screenshot
  await takeScreenshot(page, name);

  // If no expected image exists, save the current one as expected
  if (!fs.existsSync(expectedPath)) {
    fs.copyFileSync(actualPath, expectedPath);
    console.warn(`No expected image found for ${name}. Created one from the current state.`);
    return true;
  }

  // Compare with expected image
  const buffer1 = fs.readFileSync(expectedPath);
  const buffer2 = fs.readFileSync(actualPath);
  
  if (buffer1.equals(buffer2)) {
    return true;
  }

  // If images are different, calculate the difference
  const hash1 = createHash('sha256').update(buffer1).digest('hex');
  const hash2 = createHash('sha256').update(buffer2).digest('hex');
  
  if (hash1 === hash2) {
    return true;
  }

  // If hashes are different, use pixelmatch for visual diff
  const img1 = pngjs.PNG.sync.read(buffer1);
  const img2 = pngjs.PNG.sync.read(buffer2);
  
  const { width, height } = img1;
  const diff = new pngjs.PNG({ width, height });
  
  const numDiffPixels = pixelmatch(
    img1.data as any,
    img2.data as any,
    diff.data as any,
    width,
    height,
    { threshold: 0.1 }
  );
  
  const diffPercentage = (numDiffPixels * 100) / (width * height);
  
  if (diffPercentage > threshold) {
    // Save the diff image
    fs.writeFileSync(diffPath, pngjs.PNG.sync.write(diff));
    
    // Update the expected image if we're in update mode
    if (process.env.UPDATE_SCREENSHOTS) {
      fs.copyFileSync(actualPath, expectedPath);
      console.log(`Updated expected screenshot: ${name}`);
      return true;
    }
    
    return {
      pass: false,
      message: () => `Screenshot mismatch for ${name}. Difference: ${diffPercentage.toFixed(2)}%`,
      diffPath,
      actualPath,
      expectedPath
    };
  }
  
  return true;
}

export async function expectScreenshotToMatch(page: Page, name: string, options = { threshold: 0.1 }) {
  const result = await compareScreenshot(page, name, options.threshold);
  
  if (result !== true) {
    throw new Error(result.message());
  }
}
