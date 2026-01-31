import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Hydration Debug', () => {
  let helpers: TestHelpers;

  test('check page html structure and react hydration', async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Get page HTML immediately after navigation
    await page.waitForTimeout(1000);
    const html1 = await page.content();
    console.log(`HTML length (1s): ${html1.length}`);
    console.log(`Contains "monaco": ${html1.includes('monaco')}`);
    console.log(`Contains "MonacoSQLEditor": ${html1.includes('MonacoSQLEditor')}`);

    // Wait longer and check again
    await page.waitForTimeout(5000);
    const html2 = await page.content();
    console.log(`HTML length (5s): ${html2.length}`);
    console.log(`Contains "monaco": ${html2.includes('monaco')}`);
    console.log(`Contains "MonacoSQLEditor": ${html2.includes('MonacoSQLEditor')}`);

    // Check for editor-specific elements
    const viewLines = await page.locator('.view-lines').count();
    console.log(`View line elements: ${viewLines}`);

    const monacoEditor = await page.locator('.monaco-editor').count();
    console.log(`Monaco editor elements: ${monacoEditor}`);

    // Check if there's a React error boundary message
    const errorBoundary = await page.locator('text=/Error|Failed to render/').count();
    console.log(`Error boundary messages: ${errorBoundary}`);

    // Check all visible elements
    const allVisible = await page.locator('*:visible').count();
    console.log(`Total visible elements: ${allVisible}`);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-hydration-debug.png', fullPage: true });

    // Try to evaluate JavaScript in the browser context
    console.log('\n=== Browser Context Evaluation ===');
    const result = await page.evaluate(() => {
      return {
        hasReact: typeof (window as any).React !== 'undefined',
        hasNext: typeof (window as any).next !== 'undefined',
        monacoEditors: document.querySelectorAll('.monaco-editor').length,
        textareas: document.querySelectorAll('textarea').length,
        bodyHTML: document.body.innerHTML.substring(0, 500),
      };
    });
    console.log('Browser context:', JSON.stringify(result, null, 2));
  });
});
