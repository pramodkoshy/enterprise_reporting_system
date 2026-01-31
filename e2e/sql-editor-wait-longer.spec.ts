import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Long Wait Test', () => {
  let helpers: TestHelpers;

  test('wait for monaco editor with extended timeout', async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Collect console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Browser ${msg.type()}:`, text);
      }
    });

    // Wait for page
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select data source
    await page.waitForTimeout(2000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    const count = await dataSourceButtons.count();
    console.log(`Found ${count} data sources`);

    if (count > 0) {
      await dataSourceButtons.first().click();
      console.log('Selected data source');
    }

    // Wait progressively longer and check
    const waitTimes = [2, 5, 10, 15];
    let found = false;

    for (const waitTime of waitTimes) {
      console.log(`\n=== Waiting ${waitTime} seconds ===`);
      await page.waitForTimeout(waitTime * 1000);

      const monacoCount = await page.locator('.monaco-editor').count();
      const textareaCount = await page.locator('textarea').count();

      console.log(`After ${waitTime}s: Monaco editors=${monacoCount}, textareas=${textareaCount}`);

      if (monacoCount > 0) {
        found = true;
        console.log('✓ Monaco Editor found!');
        break;
      }
    }

    if (!found) {
      console.log('\n=== Monaco Editor NOT FOUND ===');
      console.log('Console logs:', consoleLogs.join('\n'));

      // Get page HTML
      const bodyHTML = await page.evaluate(() => {
        const body = document.body;
        // Find the area where Monaco should be
        const editorArea = body.querySelector('[class*="border"]');
        return editorArea ? editorArea.outerHTML.substring(0, 1000) : 'No border area found';
      });
      console.log('Editor area HTML:', bodyHTML);
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-wait-longer.png', fullPage: true });

    expect(found).toBe(true);
  });
});
