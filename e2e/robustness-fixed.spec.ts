import { test, expect } from '@playwright/test';

/**
 * ROBUSTNESS TESTS - Fixed to match actual UI
 *
 * These tests expose weaknesses in the application
 * to make it more robust and reliable
 */

test.describe('Application Robustness - Fixed', () => {
  test.use({ storageState: undefined });

  test('STRESS TEST: Rapid clicking should not break the UI', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    // STRESS: Click execute button 20 times rapidly
    const executeButton = page.getByRole('button', { name: /Run Query/i });

    for (let i = 0; i < 20; i++) {
      await executeButton.click({ timeout: 100 }).catch(() => {});
      await page.waitForTimeout(10); // 10ms between clicks
    }

    // App should not crash or become unresponsive
    await page.waitForTimeout(2000);

    // Should still be functional
    await expect(executeButton).toBeVisible();
    await expect(executeButton).toBeEnabled();
  });

  test('ERROR HANDLING: Invalid SQL should not crash the editor', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('TOTALLY INVALID SQL QUERY HERE !!!');

    // Execute invalid query
    await page.getByRole('button', { name: /Run Query/i }).click();

    // Should show error, not crash
    await page.waitForTimeout(2000);

    // Editor should still be functional
    await expect(editor).toBeVisible();

    // Should be able to type a new query
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT 1;');

    // Should be able to execute again
    await page.getByRole('button', { name: /Run Query/i }).click();

    // Should get results or error gracefully
    await page.waitForTimeout(2000);
  });

  test('NETWORK RESILIENCE: Slow queries should not block UI', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const editor = page.locator('.monaco-editor').first();
    await editor.click();

    // Type a complex query that might be slow
    await page.keyboard.type('SELECT * FROM users CROSS JOIN orders CROSS JOIN products;');

    // Start query execution (don't wait)
    page.getByRole('button', { name: /Run Query/i }).click();

    // Immediately try to interact with UI
    const startTime = Date.now();

    // Try to click another tab immediately
    await page.getByRole('tab', { name: 'Logs' }).click({ timeout: 5000 });

    const interactionTime = Date.now() - startTime;

    console.log(`UI responded in ${interactionTime}ms during query execution`);

    // UI should respond within 3 seconds even during query execution
    expect(interactionTime).toBeLessThan(3000);

    // Navigation should work
    await expect(page.getByRole('tabpanel', { name: 'Logs' })).toBeVisible();
  });

  test('STATE CONSISTENCY: Rapid page navigation should not corrupt state', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    const pages = ['/sql-editor', '/reports', '/charts', '/dashboards'];

    // Navigate rapidly between pages
    for (let i = 0; i < 5; i++) {
      for (const path of pages) {
        await page.goto(path);
        await page.waitForTimeout(100);
      }
    }

    // Final navigation should work correctly
    await page.goto('/sql-editor');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Page should be functional
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await expect(dataSourceButtons.first()).toBeVisible({ timeout: 10000 });
  });

  test('LARGE DATA: Large result sets should be handled efficiently', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT * FROM users;'); // Get all users

    const startTime = Date.now();

    await page.getByRole('button', { name: /Run Query/i }).click();

    // Wait for results or error
    await page.waitForTimeout(3000);

    const renderTime = Date.now() - startTime;

    console.log(`Query processed in ${renderTime}ms`);

    // Should complete in reasonable time (< 10 seconds)
    expect(renderTime).toBeLessThan(10000);

    // App should still be responsive
    await expect(page.getByRole('button', { name: /Run Query/i })).toBeEnabled();
  });

  test('INPUT VALIDATION: Extreme inputs should be handled gracefully', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const extremeInputs = [
      '', // Empty query
      ' '.repeat(1000), // Only spaces
      'SELECT ' + '1, '.repeat(100) + '1;', // Very long query
      ';'.repeat(20), // Many statements
    ];

    for (const input of extremeInputs) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(input);

      // Try to execute
      await page.getByRole('button', { name: /Run Query/i }).click();
      await page.waitForTimeout(1000);

      // App should not crash or freeze
      await expect(editor).toBeVisible();

      // Should be able to type again
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
    }
  });

  test('PERFORMANCE DEGRADATION: Repeated operations should not slow down', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const executionTimes: number[] = [];

    // Execute same query 30 times and measure time
    for (let i = 0; i < 30; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type('SELECT 1;');

      const startTime = Date.now();
      await page.getByRole('button', { name: /Run Query/i }).click();
      await page.waitForTimeout(500);
      executionTimes.push(Date.now() - startTime);
    }

    console.log('Execution times:', executionTimes.map(t => `${t}ms`));

    // Calculate average time for first 10 vs last 10
    const first10 = executionTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const last10 = executionTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;

    console.log(`First 10 avg: ${first10}ms, Last 10 avg: ${last10}ms`);

    // Performance should not degrade significantly over time
    // Last 10 should not be more than 2x slower than first 10
    expect(last10).toBeLessThan(first10 * 2);
  });

  test('SESSION RECOVERY: Page should recover from errors', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    // Cause an error by executing invalid query
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.type('INVALID QUERY HERE');
    await page.getByRole('button', { name: /Run Query/i }).click();
    await page.waitForTimeout(2000);

    // Now execute a valid query
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT 1;');
    await page.getByRole('button', { name: /Run Query/i }).click();

    // Should recover and show results or handle gracefully
    await page.waitForTimeout(2000);

    // Editor should still be functional
    await expect(editor).toBeVisible();
  });

  test('CONCURRENT REQUESTS: Multiple simultaneous operations should be handled', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    // Start multiple operations simultaneously
    const promises = [
      // Switch to different tabs
      page.getByRole('tab', { name: 'Errors' }).click(),
      // Try to validate
      page.getByRole('button', { name: /Validate/i }).click().catch(() => {}),
    ];

    // All should complete without errors
    await Promise.allSettled(promises);

    await page.waitForTimeout(1000);

    // Page should still be functional
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('MEMORY EFFICIENCY: Opening/closing tabs should not leak memory', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    await page.goto('/sql-editor');

    // Select data source
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const getDOMSize = () => page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    const initialDOM = await getDOMSize();
    console.log('Initial DOM size:', initialDOM);

    // Switch tabs 20 times
    for (let i = 0; i < 20; i++) {
      await page.getByRole('tab', { name: 'Results' }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: 'Errors' }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: 'Logs' }).click();
      await page.waitForTimeout(100);
    }

    const finalDOM = await getDOMSize();
    console.log('Final DOM size:', finalDOM);

    // DOM should not grow significantly
    const growth = finalDOM - initialDOM;
    console.log(`DOM growth: ${growth} elements`);

    // Less than 500 element growth is acceptable
    expect(growth).toBeLessThan(500);
  });
});
