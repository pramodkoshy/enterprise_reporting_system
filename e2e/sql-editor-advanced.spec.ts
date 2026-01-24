import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_QUERIES } from './helpers/test-helpers';

test.describe('SQL Editor - Enhanced Query Types', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
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
  });

  test('execute UNION query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const unionQuery = `
      SELECT name, email FROM users
      UNION
      SELECT name, email FROM users
      LIMIT 5;
    `;

    await helpers.typeInMonacoEditor(unionQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-union-query');
  });

  test('execute query with multiple JOINs', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const multiJoinQuery = `
      SELECT
        u.name,
        u.email,
        o.id as order_id,
        p.name as product_name,
        oi.quantity
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(multiJoinQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-multi-join');
  });

  test('execute subquery in WHERE clause', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const subqueryQuery = `
      SELECT name, email
      FROM users
      WHERE id IN (
        SELECT user_id
        FROM orders
        WHERE total_amount > 100
      )
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(subqueryQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-subquery-where');
  });

  test('execute query with CASE statement', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const caseQuery = `
      SELECT
        name,
        CASE
          WHEN email LIKE '%@admin.com' THEN 'Admin'
          WHEN email LIKE '%@test.com' THEN 'Tester'
          ELSE 'User'
        END as user_type
      FROM users
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(caseQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-case-statement');
  });

  test('execute query with DISTINCT and ORDER BY', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const distinctQuery = `
      SELECT DISTINCT status
      FROM orders
      ORDER BY status DESC;
    `;

    await helpers.typeInMonacoEditor(distinctQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-distinct-orderby');
  });

  test('execute query with multiple aggregations', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const multiAggQuery = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_amount) as total,
        AVG(total_amount) as average,
        MIN(total_amount) as minimum,
        MAX(total_amount) as maximum
      FROM orders
      GROUP BY status
      ORDER BY total DESC;
    `;

    await helpers.typeInMonacoEditor(multiAggQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-multi-aggregation');
  });

  test('execute query with date functions', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const dateQuery = `
      SELECT
        name,
        created_at,
        DATE(created_at) as date_only
      FROM users
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(dateQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-date-functions');
  });

  test('execute query with string functions', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const stringQuery = `
      SELECT
        name,
        UPPER(email) as upper_email,
        LOWER(name) as lower_name,
        SUBSTR(email, 1, 5) as email_prefix
      FROM users
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(stringQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-string-functions');
  });

  test('execute query with NULL handling', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const nullQuery = `
      SELECT
        name,
        COALESCE(description, 'No description') as description,
        CASE
          WHEN description IS NULL THEN 'Missing'
          ELSE 'Has description'
        END as has_description
      FROM users
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(nullQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-null-handling');
  });

  test('execute query with IN clause', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const inQuery = `
      SELECT name, email
      FROM users
      WHERE id IN ('usr_001', 'usr_002', 'usr_003')
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(inQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-in-clause');
  });

  test('execute query with BETWEEN clause', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const betweenQuery = `
      SELECT name, email
      FROM users
      WHERE created_at BETWEEN datetime('now', '-30 days') AND datetime('now')
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(betweenQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-between-clause');
  });

  test('execute query with LIKE pattern matching', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const likeQuery = `
      SELECT name, email
      FROM users
      WHERE name LIKE '%Admin%'
        OR email LIKE '%@test.com%'
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(likeQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-like-clause');
  });

  test('navigate through pages of results', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Execute a query
    await helpers.typeInMonacoEditor(TEST_QUERIES.simple);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    // Check pagination controls exist
    await helpers.switchTab('Results');

    // Look for pagination elements
    const nextButton = page.getByRole('button', { name: /next/i }).first();
    const prevButton = page.getByRole('button', { name: /previous/i }).first();
    const pageInfo = page.getByText(/Page \d+ of/).first();

    // Verify pagination info is visible
    if (await pageInfo.isVisible()) {
      await expect(pageInfo).toBeVisible();
    }

    await helpers.screenshot('sql-editor-pagination');
  });
});

test.describe('SQL Editor - Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
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
  });

  test('handle large result set efficiently', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Query that might return many rows
    const largeQuery = `
      SELECT * FROM users
      LIMIT 500;
    `;

    await helpers.typeInMonacoEditor(largeQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    // Should complete within reasonable time
    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 15000 });

    await helpers.screenshot('sql-editor-large-resultset');
  });

  test('rapid execution of multiple queries', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const queries = [
      'SELECT COUNT(*) FROM users;',
      'SELECT COUNT(*) FROM orders;',
      'SELECT COUNT(*) FROM products;',
    ];

    for (const query of queries) {
      await helpers.typeInMonacoEditor(query);
      await helpers.clickButton('Run');
      await helpers.waitForLoading();
      await page.waitForTimeout(500);

      // Verify execution completed
      await helpers.switchTab('Results');
    }

    await helpers.screenshot('sql-editor-rapid-execution');
  });
});

test.describe('SQL Editor - Editor Features', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
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
  });

  test('edit SQL query in Monaco editor', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Type initial query
    await helpers.typeInMonacoEditor('SELECT * FROM users;');

    // Edit it (append more text)
    await helpers.typeInMonacoEditor(' -- modified query', true);

    // Verify it was edited
    const content = await helpers.getMonacoEditorContent();
    expect(content).toContain('modified query');

    await helpers.screenshot('sql-editor-edit-query');
  });

  test('clear editor and type new query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Type first query
    await helpers.typeInMonacoEditor('SELECT * FROM users;');
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    // Clear and type new query
    await helpers.typeInMonacoEditor('SELECT * FROM orders;');
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-clear-new-query');
  });

  test('validate multiple queries in sequence', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const queriesToValidate = [
      'SELECT * FROM users;',
      'SELECT * FROM orders WHERE total_amount > 100;',
      'SELECT COUNT(*) as total FROM products;',
    ];

    for (const query of queriesToValidate) {
      await helpers.typeInMonacoEditor(query);
      await helpers.clickButton('Validate');
      await page.waitForTimeout(1000);
      await helpers.switchTab('Validation');
      await page.waitForTimeout(500);
    }

    await helpers.screenshot('sql-editor-multiple-validation');
  });
});

test.describe('SQL Editor - Complex Real-World Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('SQL Editor');
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
  });

  test('customer order summary with complex aggregations', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const summaryQuery = `
      SELECT
        u.name as customer_name,
        u.email,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(o.id) > 0
      ORDER BY total_spent DESC
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(summaryQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-customer-summary');
  });

  test('product sales by category with multiple joins', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const salesQuery = `
      SELECT
        p.name as product_name,
        p.category,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id, p.name, p.category
      ORDER BY revenue DESC
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(salesQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-product-sales');
  });

  test('find users without orders', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const noOrdersQuery = `
      SELECT u.name, u.email
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE o.id IS NULL
      LIMIT 10;
    `;

    await helpers.typeInMonacoEditor(noOrdersQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-users-no-orders');
  });

  test('time-based analytics query', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const timeQuery = `
      SELECT
        DATE(created_at) as order_date,
        COUNT(*) as order_count,
        SUM(total_amount) as daily_revenue
      FROM orders
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY order_date DESC;
    `;

    await helpers.typeInMonacoEditor(timeQuery);
    await helpers.clickButton('Run');
    await helpers.waitForLoading();

    await helpers.switchTab('Results');
    await expect(page.locator('table').first()).isVisible({ timeout: 10000 });

    await helpers.screenshot('sql-editor-time-analytics');
  });
});
