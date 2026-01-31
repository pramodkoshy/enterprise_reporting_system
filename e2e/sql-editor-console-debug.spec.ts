import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Console Debug', () => {
  test('collect all console errors and warnings', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const errors: string[] = [];
    const warnings: string[] = [];
    const logs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
        console.log(`[ERROR] ${text}`);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
        console.log(`[WARNING] ${text}`);
      } else {
        logs.push(text);
      }
    });

    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.toString()}`);
      errors.push(error.toString());
    });

    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure && failure.errorText !== 'aborted') {
        console.log(`[REQUEST FAILED] ${request.url()}: ${failure.errorText}`);
        errors.push(`Request failed: ${request.url()} - ${failure.errorText}`);
      }
    });

    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Wait for page
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    if ((await dataSourceButtons.count()) > 0) {
      await dataSourceButtons.first().click();
    }

    // Wait for any async loading
    await page.waitForTimeout(5000);

    console.log('\n=== Console Summary ===');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\nAll Errors:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (warnings.length > 0) {
      console.log('\nAll Warnings:');
      warnings.slice(0, 10).forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
    }

    // Check if monaco files loaded
    const monacoFiles = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .map(s => (s as HTMLScriptElement).src)
        .filter(src => src.includes('monaco'));
    });

    console.log(`\nMonaco files loaded: ${monacoFiles.length}`);
    monacoFiles.forEach(f => console.log(`  - ${f}`));

    // Check React internals
    const reactInfo = await page.evaluate(() => {
      const nextRoot = document.querySelector('#__next');
      const reactFiber = (nextRoot as any)?.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      return {
        hasNextRoot: !!nextRoot,
        reactFiberKeys: reactFiber ? Object.keys(reactFiber) : [],
        bodyChildCount: document.body.children.length
      };
    });

    console.log('\nReact Info:', JSON.stringify(reactInfo, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-console-debug.png', fullPage: true });
  });
});
