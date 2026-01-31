import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('SQL Editor - Complex Query Test', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
    await page.waitForLoadState('networkidle');
  });

  test('write complex query, validate, and run', async ({ page }) => {
    console.log('=== Starting Complex Query Test ===');

    // Wait for page title
    await expect(page.locator('h1')).toContainText('SQL Editor');

    // Select a data source
    await page.waitForTimeout(1000);
    const dataSourceButtons = page.locator('button').filter({ hasText: /^[A-Z]/ });
    const count = await dataSourceButtons.count();

    if (count > 0) {
      console.log(`Selecting from ${count} data sources`);
      await dataSourceButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Wait for Monaco Editor to load (CRITICAL!)
    console.log('Waiting for Monaco Editor to load...');
    await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2000); // Additional wait for Monaco to fully initialize

    // Find the Monaco Editor textarea
    const monacoTextarea = page.locator('.monaco-editor textarea').first();
    await monacoTextarea.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Monaco Editor textarea found');

    // Click to focus
    await monacoTextarea.click();
    await page.waitForTimeout(500);

    // Clear and type a complex SQL query
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

    console.log('Typing query...');
    await monacoTextarea.fill(complexQuery);
    await page.waitForTimeout(1000);

    // Verify query was entered
    const value = await monacoTextarea.inputValue();
    console.log(`Query entered (${value.length} characters)`);
    expect(value.length).toBeGreaterThan(100);

    // Click the Validate button
    console.log('Clicking Validate button...');
    const validateButton = page.locator('button').filter({ hasText: 'Validate' });
    await validateButton.click();
    await page.waitForTimeout(3000);

    // Check for validation result
    const validationResult = page.locator('text=/SQL is valid|SQL has errors/');
    const validationVisible = await validationResult.isVisible();
    console.log('Validation result visible:', validationVisible);

    if (validationVisible) {
      const validationText = await validationResult.textContent();
      console.log('Validation result:', validationText);
    }

    // Click the Run Query button
    console.log('Clicking Run Query button...');
    const runButton = page.locator('button').filter({ hasText: /Run Query/ });
    await runButton.click();

    // Wait for results (longer for complex query)
    console.log('Waiting for query results...');
    await page.waitForTimeout(8000);

    // Check for results
    const resultText = page.locator('text=/Result:/');
    const resultVisible = await resultText.isVisible();
    console.log('Query result visible:', resultVisible);

    if (resultVisible) {
      const resultContent = await resultText.textContent();
      console.log('Result:', resultContent);
      expect(resultContent).toBeTruthy();
    }

    // Check for errors
    const errorText = page.locator('text=/error|Error|ERROR/');
    const errorVisible = await errorText.isVisible();
    if (errorVisible) {
      const errorContent = await errorText.textContent();
      console.log('Error found:', errorContent);
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/sql-editor-complex-query-result.png', fullPage: true });
    console.log('Screenshot saved');
  });
});
