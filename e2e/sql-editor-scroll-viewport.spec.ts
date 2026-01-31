import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Viewport Test', () => {
  test('scroll to editor and check visibility', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    if ((await dataSourceButtons.count()) > 0) {
      await dataSourceButtons.first().click();
    }

    // Get viewport info
    const viewportInfo = await page.evaluate(() => {
      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        scrollY: window.scrollY,
        documentHeight: document.body.scrollHeight
      };
    });
    console.log('Viewport:', viewportInfo);

    // Scroll down to where editor should be
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(2000);

    // Check for monaco editor after scroll
    let monacoCount = await page.locator('.monaco-editor').count();
    console.log(`Monaco editors after scrolling 300px: ${monacoCount}`);

    if (monacoCount === 0) {
      // Try more scrolling
      await page.evaluate(() => {
        window.scrollTo(0, 600);
      });
      await page.waitForTimeout(2000);

      monacoCount = await page.locator('.monaco-editor').count();
      console.log(`Monaco editors after scrolling 600px: ${monacoCount}`);
    }

    // Check intersection observer for editor area
    const editorVisibility = await page.evaluate(() => {
      const borderDivs = Array.from(document.querySelectorAll('[class*="border"]'));
      const editorArea = borderDivs.find(div => {
        const rect = div.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

      if (editorArea) {
        const rect = editorArea.getBoundingClientRect();
        return {
          found: true,
          top: rect.top,
          bottom: rect.bottom,
          inViewport: rect.top < window.innerHeight && rect.bottom > 0,
          className: editorArea.className,
          hasMonacoChild: !!editorArea.querySelector('.monaco-editor')
        };
      }

      return { found: false };
    });

    console.log('Editor visibility:', JSON.stringify(editorVisibility, null, 2));

    // Try to click directly on the editor area
    const borderDiv = page.locator('div.border').nth(1); // Skip the first one (data source)
    const box = await borderDiv.boundingBox();

    if (box) {
      console.log(`Clicking at (${box.x + 100}, ${box.y + 100})`);
      await page.mouse.click(box.x + 100, box.y + 100);
      await page.waitForTimeout(1000);

      // Check again for monaco
      monacoCount = await page.locator('.monaco-editor').count();
      console.log(`Monaco editors after click: ${monacoCount}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-viewport-test.png', fullPage: true });
  });
});
