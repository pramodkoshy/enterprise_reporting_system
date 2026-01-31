import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Direct Execution Test', () => {
  let helpers: TestHelpers;

  test('directly set SQL and execute via React state', async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Wait for page
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    const count = await dataSourceButtons.count();
    console.log(`Found ${count} data sources`);

    if (count > 0) {
      await dataSourceButtons.first().click();
      console.log('Selected data source');
      await page.waitForTimeout(1000);
    }

    // Use JavaScript to directly find and manipulate React state
    const complexQuery = `-- Complex query: Analyze film rentals by customer category
WITH customer_rentals AS (
  SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    COUNT(r.rental_id) as total_rentals,
    SUM(p.amount) as total_spent
  FROM customer c
  LEFT JOIN rental r ON c.customer_id = r.customer_id
  LEFT JOIN payment p ON r.rental_id = p.rental_id
  GROUP BY c.customer_id, c.first_name, c.last_name
),
spending_categories AS (
  SELECT
    customer_id,
    first_name,
    last_name,
    total_rentals,
    total_spent,
    CASE
      WHEN total_spent > 200 THEN 'High Value'
      WHEN total_spent > 100 THEN 'Medium Value'
      ELSE 'Low Value'
    END as customer_category
  FROM customer_rentals
)
SELECT
  customer_category,
  COUNT(*) as customer_count,
  AVG(total_rentals) as avg_rentals,
  AVG(total_spent) as avg_spent,
  MAX(total_spent) as max_spent,
  MIN(total_spent) as min_spent
FROM spending_categories
GROUP BY customer_category
ORDER BY avg_spent DESC;`;

    // Try to find the editor using React DevTools hooks
    const result = await page.evaluate(async (query) => {
      // Try to find React fiber and update state
      const findReactRoot = () => {
        const rootEl = document.querySelector('#__next');
        if (rootEl && (rootEl as any)._reactRootContainer) {
          return (rootEl as any)._reactRootContainer._internalRoot.current;
        }
        // Try newer React 18 API
        if (rootEl && (rootEl as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = (rootEl as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          const renderers = hook.renderers.get(1);
          if (renderers) {
            return renderers.getCurrentFiber();
          }
        }
        return null;
      };

      const rootFiber = findReactRoot();

      // Try to dispatch events to simulate typing
      const textarea = document.querySelector('textarea');
      if (textarea) {
        // Set value directly
        (textarea as any).value = query;

        // Dispatch input event
        const event = new Event('input', { bubbles: true, cancelable: true });
        (textarea as any).dispatchEvent(event);

        // Dispatch change event
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        (textarea as any).dispatchEvent(changeEvent);

        return { success: true, method: 'textarea', found: true };
      }

      // Try to find Monaco Editor instance
      const monacoEditor = document.querySelector('.monaco-editor');
      if (monacoEditor) {
        return { success: false, method: 'monaco', found: true };
      }

      return { success: false, method: 'none', found: false, rootFiber: !!rootFiber };
    }, complexQuery);

    console.log('Direct manipulation result:', result);

    // Try clicking on the editor area to focus it
    await page.mouse.click(400, 400);
    await page.waitForTimeout(500);

    // Try to type using page.keyboard
    await page.keyboard.type('SELECT * FROM actor LIMIT 5;');
    await page.waitForTimeout(1000);

    // Check if anything was entered
    const textareas = await page.locator('textarea').all();
    console.log(`Textareas found: ${textareas.length}`);

    for (let i = 0; i < textareas.length; i++) {
      const value = await textareas[i].inputValue();
      console.log(`Textarea ${i} value: "${value}"`);
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-direct-execution.png', fullPage: true });
  });
});
