import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_QUERIES } from './helpers/test-helpers';

test.describe('SQL Editor - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
  });

  test('SQL Editor page loads correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Check for main page elements
    await expect(page.getByRole('heading', { name: 'SQL Editor' })).toBeVisible();
    await expect(page.getByText('Write and execute SQL queries')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    // Check for Monaco editor
    await helpers.waitForMonacoEditor();

    // Check for tabs
    await expect(page.getByRole('tab', { name: 'Results' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Validation' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Schema' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Logs' })).toBeVisible();

    await helpers.screenshot('sql-editor-loaded');
  });

  test('select data source and load schema', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data sources to load
    await helpers.waitForLoading();

    // Select a data source (assuming there's at least one active)
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();

      // Wait for dropdown content
      await page.waitForTimeout(500);

      // Select first available data source
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();

        // Wait for schema to load
        await helpers.waitForLoading();

        // Switch to Schema tab
        await helpers.switchTab('Schema');

        // Verify schema loaded
        await expect(page.getByText('Schema Loaded Successfully')).toBeVisible({ timeout: 10000 });

        await helpers.screenshot('sql-editor-schema-loaded');
      }
    }
  });

  test('execute simple SELECT query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source selection
    await helpers.waitForLoading();

    // Try to select data source if available
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);

      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Type a simple query in Monaco editor
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);

    // Click Run button
    await helpers.clickButton('Run');

    // Wait for results
    await helpers.waitForLoading();

    // Switch to Results tab (should be active)
    await helpers.switchTab('Results');

    // Verify results table is shown
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Verify we have some data
    await helpers.verifyTableHasContent();

    await helpers.screenshot('sql-editor-simple-query-results');
  });

  test('validate SQL query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Type a query
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);

    // Click Validate button
    await helpers.clickButton('Validate');

    // Wait for validation to complete
    await page.waitForTimeout(2000);

    // Switch to Validation tab
    await helpers.switchTab('Validation');

    // Check validation panel is visible
    await expect(page.locator('text=/Valid|Invalid|Error/').first()).toBeVisible({ timeout: 5000 });

    await helpers.screenshot('sql-editor-validation-result');
  });

  test('execute complex JOIN query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source and select if available
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Type complex JOIN query
    await helpers.typeInMonacoEditor(TEST_QUERIES.complexJoin);

    // Run the query
    await helpers.clickButton('Run');

    // Wait for results
    await helpers.waitForLoading();

    // Verify results
    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Verify expected columns are present
    await expect(page.getByText('name')).toBeVisible();
    await expect(page.getByText('email')).toBeVisible();
    await expect(page.getByText('order_count')).toBeVisible();
    await expect(page.getByText('total_spent')).toBeVisible();

    await helpers.screenshot('sql-editor-complex-join-results');
  });

  test('execute query with aggregations and GROUP BY', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Type aggregation query
    await helpers.typeInMonacoEditor(TEST_QUERIES.aggregation);

    // Run the query
    await helpers.clickButton('Run');

    // Wait for results
    await helpers.waitForLoading();

    // Verify results
    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Verify aggregation columns
    await expect(page.getByText('status')).toBeVisible();
    await expect(page.getByText('count')).toBeVisible();
    await expect(page.getByText('total')).toBeVisible();
    await expect(page.getByText('average')).toBeVisible();

    await helpers.screenshot('sql-editor-aggregation-results');
  });

  test('execute query with CTE (WITH clause)', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Type CTE query
    await helpers.typeInMonacoEditor(TEST_QUERIES.withSubquery);

    // Run the query
    await helpers.clickButton('Run');

    // Wait for results
    await helpers.waitForLoading();

    // Verify results
    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    await helpers.screenshot('sql-editor-cte-results');
  });

  test('save query for later use', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Type a query
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);

    // Click Save button
    await helpers.clickButton('Save');

    // Fill in save dialog
    await helpers.fillByLabel('Name', 'Test Saved Query');
    await helpers.fillByLabel('Description', 'This is a test query from E2E tests');

    // Click Save Query button
    await helpers.clickButton('Save Query');

    // Verify success toast
    await helpers.verifyToast('Query saved successfully');

    await helpers.screenshot('sql-editor-query-saved');
  });

  test('view query execution logs', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Switch to Logs tab
    await helpers.switchTab('Logs');

    // Verify logs tab is visible
    await expect(page.getByText('No logs available')).toBeVisible();

    // Run a query
    await helpers.switchTab('Results');
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    // Check logs again
    await helpers.switchTab('Logs');

    // Logs should now be populated
    await expect(page.getByText(/loading|schema|query/i)).toBeVisible({ timeout: 5000 });

    await helpers.screenshot('sql-editor-logs');
  });
});

test.describe('SQL Editor - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
  });

  test('handle SQL syntax error', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Type invalid SQL
    await helpers.typeInMonacoEditor('SELCT * FROM users;'); // typo in SELECT

    // Click Run
    await helpers.clickButton('Run');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should show error in Results tab
    await helpers.switchTab('Results');

    // Error message should be visible
    const errorVisible = await page.getByText(/error|syntax|invalid/i).isVisible();
    expect(errorVisible).toBe(true);

    await helpers.screenshot('sql-editor-syntax-error');
  });

  test('handle missing data source error', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Try to run without selecting data source
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
    await helpers.clickButton('Run');

    // Should show toast error
    await helpers.verifyToast('Please select a data source', 'error');

    await helpers.screenshot('sql-editor-no-datasource-error');
  });

  test('validate without data source shows appropriate message', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Type query and click Validate
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
    await helpers.clickButton('Validate');

    // Wait for validation
    await page.waitForTimeout(2000);

    // Switch to Validation tab
    await helpers.switchTab('Validation');

    // Should show validation result or error
    const validationPanel = page.locator('text=/Syntax|Validation|Error|Data source/').first();
    await expect(validationPanel).toBeVisible({ timeout: 5000 });

    await helpers.screenshot('sql-editor-validate-no-datasource');
  });
});

test.describe('SQL Editor - Schema Browser', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
  });

  test('click table to generate SELECT query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Wait for schema to load
    await page.waitForTimeout(2000);

    // Try to click on a table in the schema browser
    const tableElement = page.locator('text=/users|orders|customers/i').first();
    if (await tableElement.isVisible()) {
      await tableElement.click();

      // Verify the editor content changed
      await page.waitForTimeout(500);

      const editorContent = await helpers.getMonacoEditorContent();
      expect(editorContent).toContain('SELECT * FROM');
    }

    await helpers.screenshot('sql-editor-table-click');
  });

  test('view schema details', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
      }
    }

    // Switch to Schema tab
    await helpers.switchTab('Schema');

    // Wait for schema to load
    await page.waitForTimeout(3000);

    // Verify schema information is displayed
    await expect(page.getByText(/table|view|schema/i)).toBeVisible();

    await helpers.screenshot('sql-editor-schema-details');
  });
});

test.describe('SQL Editor - Results Table', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Wait for data source and run a query
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();
        await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
        await helpers.clickButton('Run');
        await helpers.waitForLoading();
      }
    }
  });

  test('results table displays data correctly', async ({ page }) => {
    // Verify results are visible
    await expect(page.locator('table').first()).toBeVisible();

    // Check for table headers
    const headers = page.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    // Check for table rows
    await helpers.verifyTableHasContent();
  });

  test('sort results by clicking column headers', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click a column header to sort
    const firstHeader = page.locator('th').first();
    await firstHeader.click();

    // Wait for sorting
    await page.waitForTimeout(500);

    // Verify table still has content
    await helpers.verifyTableHasContent();

    await helpers.screenshot('sql-editor-sorted-results');
  });
});

test.describe('SQL Editor - Multiple Queries', () => {
  test('execute multiple queries in sequence', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');

    // Wait for data source
    await helpers.waitForLoading();
    const dataSourceTrigger = page.locator('[data-state="closed"]').first();
    if (await dataSourceTrigger.isVisible()) {
      await dataSourceTrigger.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await helpers.waitForLoading();

        // Execute first query
        await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
        await helpers.clickButton('Run');
        await helpers.waitForLoading();

        // Verify first results
        await helpers.switchTab('Results');
        await expect(page.locator('table').first()).toBeVisible();

        // Execute second query
        await helpers.typeInMonacoEditor(TEST_QUERIES.join);
        await helpers.clickButton('Run');
        await helpers.waitForLoading();

        // Verify second results
        await helpers.switchTab('Results');
        await expect(page.locator('table').first()).toBeVisible();

        await helpers.screenshot('sql-editor-multiple-queries');
      }
    }
  });
});
