const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

// List of pages to test
const pages = [
  { path: '/', name: 'Home' },
  { path: '/settings', name: 'Settings' },
  // Add more pages as needed
];

pages.forEach(({ path, name }) => {
  test.describe(`Accessibility: ${name} Page`, () => {
    test('should not have any automatically detectable WCAG A or AA violations', async ({
      page,
    }) => {
      await page.goto(path);

      // Wait for the page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Configure and run accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.skip-a11y-check') // Exclude elements with this class
        .analyze();

      // Log any violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(
          'Accessibility violations found:',
          JSON.stringify(accessibilityScanResults.violations, null, 2)
        );
      }

      // Assert no critical or serious issues
      const criticalIssues = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalIssues).toEqual([]);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto(path);

      // Check for exactly one h1 per page
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // Check heading hierarchy
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
        elements.map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent.trim(),
          id: el.id || null,
        }))
      );

      // Log headings for debugging
      console.log(`Headings on ${path}:`, JSON.stringify(headings, null, 2));

      // Check for skipped heading levels
      let lastLevel = 0;
      for (const heading of headings) {
        const currentLevel = parseInt(heading.tag.substring(1));
        if (lastLevel > 0 && currentLevel > lastLevel + 1) {
          throw new Error(`Skipped heading level: ${heading.tag} (${heading.text})`);
        }
        lastLevel = currentLevel;
      }
    });

    test('all images should have alt text', async ({ page }) => {
      await page.goto(path);

      const images = await page.$$eval('img', (imgs) =>
        imgs.map((img) => ({
          src: img.src,
          alt: img.alt,
          isDecorative:
            img.getAttribute('role') === 'presentation' ||
            img.getAttribute('aria-hidden') === 'true',
        }))
      );

      const imagesMissingAlt = images.filter((img) => !img.isDecorative && !img.alt.trim());

      if (imagesMissingAlt.length > 0) {
        console.log('Images missing alt text:', imagesMissingAlt);
      }

      expect(imagesMissingAlt).toEqual([]);
    });
  });
});
