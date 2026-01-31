import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Debug Click Issue', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
    await page.waitForLoadState('networkidle');
  });

  test('debug monaco editor clickability', async ({ page }) => {
    console.log('=== SQL Editor Debug Test ===');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select a data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    const count = await dataSourceButtons.count();

    if (count > 0) {
      console.log(`Found ${count} data source buttons`);
      await dataSourceButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Check what's visible on the page
    console.log('=== Page Elements ===');

    // Check for textarea elements
    const textareas = await page.locator('textarea').all();
    console.log(`Found ${textareas.length} textarea elements`);

    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      const isVisible = await textarea.isVisible();
      const isEnabled = await textarea.isEnabled();
      const boundingBox = await textarea.boundingBox();

      console.log(`Textarea ${i}:`);
      console.log(`  - Visible: ${isVisible}`);
      console.log(`  - Enabled: ${isEnabled}`);
      console.log(`  - Bounding box: ${JSON.stringify(boundingBox)}`);

      if (boundingBox) {
        console.log(`  - Position: x=${boundingBox.x}, y=${boundingBox.y}`);
        console.log(`  - Size: width=${boundingBox.width}, height=${boundingBox.height}`);
      }
    }

    // Check for the Monaco Editor container
    console.log('\n=== Monaco Editor Container ===');
    const editorContainer = page.locator('.monaco-editor').first();
    const editorVisible = await editorContainer.isVisible();
    console.log(`Monaco editor container visible: ${editorVisible}`);

    if (editorVisible) {
      const editorBox = await editorContainer.boundingBox();
      console.log(`Monaco editor bounding box: ${JSON.stringify(editorBox)}`);

      // Check computed styles
      const zIndex = await editorContainer.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      console.log(`Monaco editor z-index: ${zIndex}`);

      const pointerEvents = await editorContainer.evaluate((el) => {
        return window.getComputedStyle(el).pointerEvents;
      });
      console.log(`Monaco editor pointer-events: ${pointerEvents}`);
    }

    // Check for any overlay elements
    console.log('\n=== Checking for overlays ===');
    const allDivs = await page.locator('div').all();
    console.log(`Total divs on page: ${allDivs.length}`);

    // Find divs with high z-index that might be blocking
    for (let i = 0; i < Math.min(allDivs.length, 100); i++) {
      const div = allDivs[i];
      const zIndex = await div.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.zIndex;
      });

      if (zIndex !== 'auto' && parseInt(zIndex) > 10) {
        const isVisible = await div.isVisible();
        if (isVisible) {
          const text = await div.textContent();
          console.log(`Found high z-index div (${zIndex}): "${text?.substring(0, 50)}"`);
        }
      }
    }

    // Try to click using JavaScript (bypassing Playwright's checks)
    console.log('\n=== Attempting JavaScript click ===');
    const firstTextarea = page.locator('textarea').first();

    try {
      await firstTextarea.evaluate((el: any) => {
        el.focus();
        el.click();
      });
      console.log('JavaScript click successful');

      // Wait a bit
      await page.waitForTimeout(500);

      // Check if textarea is focused
      const isFocused = await firstTextarea.evaluate((el: any) => {
        return document.activeElement === el;
      });
      console.log(`Textarea focused: ${isFocused}`);
    } catch (error) {
      console.log(`JavaScript click failed: ${error}`);
    }

    // Try typing using JavaScript
    console.log('\n=== Attempting to type using JavaScript ===');
    try {
      await firstTextarea.evaluate((el: any) => {
        el.value = 'SELECT * FROM film LIMIT 10;';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      console.log('JavaScript type successful');

      await page.waitForTimeout(500);

      const value = await firstTextarea.inputValue();
      console.log(`Textarea value: ${value}`);
    } catch (error) {
      console.log(`JavaScript type failed: ${error}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-debug.png', fullPage: true });
    console.log('\nScreenshot saved to screenshots/sql-editor-debug.png');
  });
});
