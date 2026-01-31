import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Console Errors', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Console Error:', msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
  });

  test('check for console errors and monaco editor loading', async ({ page }) => {
    console.log('=== Checking for errors ===');

    // Wait for page
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select a data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    const count = await dataSourceButtons.count();

    if (count > 0) {
      await dataSourceButtons.first().click();
      await page.waitForTimeout(2000);
    }

    // Check if Monaco Editor div exists (even if not visible)
    console.log('\n=== Checking Monaco Editor DOM ===');
    const monacoEditorCount = await page.locator('.monaco-editor').count();
    console.log(`Monaco editor elements found: ${monacoEditorCount}`);

    // Check for the wrapper div
    const wrapperDivs = await page.locator('div[style*="zIndex"]').all();
    console.log(`Divs with zIndex: ${wrapperDivs.length}`);

    for (let i = 0; i < wrapperDivs.length; i++) {
      const div = wrapperDivs[i];
      const style = await div.getAttribute('style');
      const isVisible = await div.isVisible();
      const text = await div.textContent();
      console.log(`Wrapper ${i}: visible=${isVisible}, style=${style}, text="${text?.substring(0, 50)}"`);
    }

    // Check for React root
    const reactRoot = await page.locator('#__next').count();
    console.log(`React root found: ${reactRoot > 0}`);

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Wait longer and check again
    await page.waitForTimeout(3000);

    console.log('\n=== After waiting 3 seconds ===');
    const monacoAfter = await page.locator('.monaco-editor').count();
    console.log(`Monaco editor elements: ${monacoAfter}`);

    const textareaAfter = await page.locator('textarea').count();
    console.log(`Textarea elements: ${textareaAfter}`);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-console-debug.png', fullPage: true });
  });
});
