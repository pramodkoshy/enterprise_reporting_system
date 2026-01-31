import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Stacking Context Debug', () => {
  test('check z-index and stacking context', async ({ page }) => {
    const helpers = new TestHelpers(page);
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

    // Wait and then analyze the page
    await page.waitForTimeout(5000);

    // Use JavaScript to analyze z-index values and stacking contexts
    const stackingAnalysis = await page.evaluate(() => {
      const result: any = {
        header: null,
        editorArea: null,
        monacoEditor: null,
        overlays: []
      };

      // Find header
      const header = document.querySelector('header');
      if (header) {
        const headerStyle = window.getComputedStyle(header);
        result.header = {
          tagName: header.tagName,
          zIndex: headerStyle.zIndex,
          position: headerStyle.position,
          display: headerStyle.display
        };
      }

      // Find all divs that might be the editor area
      const allDivs = Array.from(document.querySelectorAll('div'));
      const borderDivs = allDivs.filter(d => {
        const style = window.getComputedStyle(d);
        return style.border !== 'none' && style.border !== '';
      });

      // Find the Monaco Editor area
      const monacoContainer = document.querySelector('.monaco-editor');
      if (monacoContainer) {
        const style = window.getComputedStyle(monacoContainer);
        const parent = monacoContainer.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;

        result.monacoEditor = {
          zIndex: style.zIndex,
          position: style.position,
          pointerEvents: style.pointerEvents,
          display: style.display,
          visible: style.display !== 'none' && style.visibility !== 'hidden',
          offsetParent: monacoContainer.offsetParent?.tagName || 'none',
          parentZIndex: parentStyle?.zIndex || 'none',
          parentPosition: parentStyle?.position || 'none'
        };
      }

      // Find elements with high z-index that might be blocking
      allDivs.forEach(div => {
        const style = window.getComputedStyle(div);
        const zIndex = parseInt(style.zIndex);

        if (!isNaN(zIndex) && zIndex > 10) {
          const rect = div.getBoundingClientRect();
          const isVisible = style.display !== 'none' &&
                           style.visibility !== 'hidden' &&
                           rect.width > 0 &&
                           rect.height > 0;

          if (isVisible) {
            result.overlays.push({
              zIndex: zIndex,
              position: style.position,
              tagName: div.tagName,
              className: div.className,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              },
              text: div.textContent?.substring(0, 50)
            });
          }
        }
      });

      // Check if there's a modal or dialog
      const modal = document.querySelector('[role="dialog"], .modal, .overlay');
      result.hasModal = !!modal;

      return result;
    });

    console.log('\n=== Stacking Context Analysis ===');
    console.log(JSON.stringify(stackingAnalysis, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-stacking-context.png', fullPage: true });
  });
});
