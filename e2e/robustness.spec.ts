import { test, expect } from './fixtures/auth.fixture';

/**
 * ROBUSTNESS & RELIABILITY TESTS
 *
 * These tests are designed to EXPOSE weaknesses in the application
 * so they can be fixed to make the app more robust and reliable.
 *
 * Areas tested:
 * - Race conditions
 * - Concurrency issues
 * - Error handling
 * - Memory leaks
 * - Performance degradation
 * - Edge cases
 * - State corruption
 */

test.describe('Application Robustness - Exposing Weaknesses', () => {
  test('STRESS TEST: Rapid clicking should not break the UI', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    // Select data source
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();

    // STRESS: Click execute button 20 times rapidly
    // This exposes: race conditions, missing debouncing, duplicate requests
    const executeButton = page.getByRole('button', { name: /execute/i });

    for (let i = 0; i < 20; i++) {
      await executeButton.click({ timeout: 100 }).catch(() => {});
      await page.waitForTimeout(10); // 10ms between clicks (very fast)
    }

    // App should not crash or become unresponsive
    await page.waitForTimeout(2000);

    // Should still be functional
    await expect(executeButton).toBeVisible();
    await expect(executeButton).toBeEnabled();

    // Should have handled rapid clicks gracefully (not crashed)
    const errors = await page.evaluate(() => {
      const errors: string[] = [];
      return errors;
    });

    // Check for React errors in console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        expect(text).not.toContain('Warning:');
        expect(text).not.toContain('Error:');
      }
    });
  });

  test('CONCURRENCY TEST: Multiple tabs should not cause state corruption', async ({ authenticatedPage: page }) => {
    // Create two tabs (simulating multiple browser tabs)
    const page2 = await page.context().newPage();

    try {
      // Both tabs navigate to SQL Editor
      await Promise.all([
        page.goto('/sql-editor'),
        page2.goto('/sql-editor'),
      ]);

      // Both tabs select data source
      await Promise.all([
        (async () => {
          const trigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
          await trigger.click();
          await page.waitForSelector('[role="option"]');
          await page.locator('[role="option"]').first().click();
        })(),
        (async () => {
          const trigger = page2.locator('button').filter({ hasText: /Select data source/i }).first();
          await trigger.click();
          await page2.waitForSelector('[role="option"]');
          await page2.locator('[role="option"]').first().click();
        })(),
      ]);

      // Both tabs execute different queries simultaneously
      await Promise.all([
        (async () => {
          const editor = page.locator('.monaco-editor').first();
          await editor.click();
          await page.keyboard.type('SELECT * FROM users LIMIT 10;');
          await page.getByRole('button', { name: /execute/i }).click();
        })(),
        (async () => {
          const editor = page2.locator('.monaco-editor').first();
          await editor.click();
          await page2.keyboard.type('SELECT * FROM orders LIMIT 10;');
          await page2.getByRole('button', { name: /execute/i }).click();
        })(),
      ]);

      // Both should get results without errors
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('table')).toBeVisible({ timeout: 10000 });

      // Verify results are correct (not mixed up)
      const page1Result = await page.locator('table').textContent();
      const page2Result = await page2.locator('table').textContent();

      expect(page1Result).not.toBe(page2Result); // Should be different
    } finally {
      await page2.close();
    }
  });

  test('MEMORY TEST: Long-running session should not leak memory', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    // Select data source once
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const getMemoryUsage = () => page.evaluate(() => {
      // @ts-ignore
      return performance.memory?.usedJSHeapSize || 0;
    });

    const measurements: number[] = [];

    // Take baseline measurement
    measurements.push(await getMemoryUsage());

    // Execute 100 queries to expose memory leaks
    for (let i = 0; i < 100; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(`SELECT * FROM users WHERE id = ${i % 10};`);

      await page.getByRole('button', { name: /execute/i }).click();
      await page.waitForSelector('table', { state: 'visible', timeout: 5000 }).catch(() => {});

      // Measure memory every 10 iterations
      if (i % 10 === 0) {
        measurements.push(await getMemoryUsage());
      }
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      // @ts-ignore
      if (window.gc) window.gc();
    });

    measurements.push(await getMemoryUsage());

    console.log('Memory measurements (MB):', measurements.map(m => (m / 1024 / 1024).toFixed(2)));

    // Calculate memory growth rate
    const initialMemory = measurements[0];
    const finalMemory = measurements[measurements.length - 1];
    const totalGrowth = finalMemory - initialMemory;
    const growthPerIteration = totalGrowth / 100;

    console.log(`Total memory growth: ${(totalGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Growth per iteration: ${(growthPerIteration / 1024).toFixed(2)}KB`);

    // FAIL if memory is leaking significantly
    // More than 100MB growth for 100 queries indicates a leak
    expect(totalGrowth).toBeLessThan(100 * 1024 * 1024);

    // Growth per iteration should be minimal (< 100KB)
    expect(growthPerIteration).toBeLessThan(100 * 1024);
  });

  test('ERROR HANDLING: Invalid SQL should not crash the editor', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.type('TOTALLY INVALID SQL QUERY HERE !!!');

    // Execute invalid query
    await page.getByRole('button', { name: /execute/i }).click();

    // Should show error, not crash
    await page.waitForTimeout(2000);

    // Editor should still be functional
    await expect(editor).toBeVisible();

    // Should be able to type a new query
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT 1;');

    // Should be able to execute again
    await page.getByRole('button', { name: /execute/i }).click();

    // Should get results
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('NETWORK RESILIENCE: Slow queries should not block UI', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const editor = page.locator('.monaco-editor').first();
    await editor.click();

    // Type a complex query that might be slow
    await page.keyboard.type('SELECT * FROM users CROSS JOIN orders CROSS JOIN products;');

    // Start query execution (don't wait)
    page.getByRole('button', { name: /execute/i }).click();

    // Immediately try to interact with UI
    // This tests if the UI remains responsive during query execution
    const startTime = Date.now();

    // Try to click another button immediately
    await page.getByRole('tab', { name: 'Validation' }).click({ timeout: 5000 });

    const interactionTime = Date.now() - startTime;

    // UI should respond within 2 seconds even during query execution
    expect(interactionTime).toBeLessThan(2000);

    // Navigation should work
    await expect(page.getByRole('tabpanel', { name: 'Validation' })).toBeVisible();
  });

  test('STATE CONSISTENCY: Rapid page navigation should not corrupt state', async ({ authenticatedPage: page }) => {
    const pages = ['/sql-editor', '/reports', '/charts', '/dashboards'];

    // Navigate rapidly between pages
    for (let i = 0; i < 10; i++) {
      for (const path of pages) {
        await page.goto(path);
        await page.waitForTimeout(100); // Very short wait, don't wait for full load
      }
    }

    // Final navigation should work correctly
    await page.goto('/sql-editor');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Page should be functional
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
  });

  test('LARGE DATA: Large result sets should be handled efficiently', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.type('SELECT * FROM users;'); // Get all users

    const startTime = Date.now();

    await page.getByRole('button', { name: /execute/i }).click();
    await page.waitForSelector('table', { state: 'visible', timeout: 15000 });

    const renderTime = Date.now() - startTime;

    console.log(`Large result set rendered in ${renderTime}ms`);

    // Should render in reasonable time (< 5 seconds)
    expect(renderTime).toBeLessThan(5000);

    // Table should be scrollable (virtual scrolling)
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Scrolling should work
    await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) {
        table.scrollTop = 1000;
      }
    });

    await page.waitForTimeout(500);

    // App should still be responsive
    await expect(page.getByRole('button', { name: /execute/i })).toBeEnabled();
  });

  test('INPUT VALIDATION: Extreme inputs should be handled gracefully', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const extremeInputs = [
      '', // Empty query
      ' '.repeat(10000), // Only spaces
      'SELECT * FROM users WHERE name = ' + "'x'".repeat(1000), // Very long string
      'SELECT '.repeat(1000) + '1;', // Very long query
      ';'.repeat(100), // Many statements
      '--' + '\n'.repeat(100) + 'SELECT 1;', // Lots of comments
    ];

    for (const input of extremeInputs) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(input);

      // Try to execute
      await page.getByRole('button', { name: /execute/i }).click();
      await page.waitForTimeout(1000);

      // App should not crash or freeze
      await expect(editor).toBeVisible();

      // Should be able to type again
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
    }
  });

  test('PERFORMANCE DEGRADATION: Repeated operations should not slow down', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const executionTimes: number[] = [];

    // Execute same query 50 times and measure time
    for (let i = 0; i < 50; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type('SELECT 1;');

      const startTime = Date.now();
      await page.getByRole('button', { name: /execute/i }).click();
      await page.waitForSelector('table', { state: 'visible', timeout: 5000 });
      executionTimes.push(Date.now() - startTime);

      await page.waitForTimeout(50);
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

  test('RESOURCE CLEANUP: Opening/closing components should not leave DOM clutter', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');

    const getDOMSize = () => page.evaluate(() => {
      return {
        elements: document.querySelectorAll('*').length,
        listeners: () => {
          // Rough estimate of event listeners
          let count = 0;
          document.querySelectorAll('*').forEach(el => {
            // @ts-ignore
            const events = getEventListeners ? getEventListeners(el) : {};
            count += Object.values(events).reduce((sum: number, arr: any) => sum + arr.length, 0);
          });
          return count;
        },
      };
    });

    const initialDOM = await getDOMSize();
    console.log('Initial DOM size:', initialDOM.elements);

    // Open and close report editor 10 times
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /new report/i }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.waitForTimeout(500);
    }

    const finalDOM = await getDOMSize();
    console.log('Final DOM size:', finalDOM.elements);

    // DOM should not grow significantly
    const growth = finalDOM.elements - initialDOM.elements;
    console.log(`DOM growth: ${growth} elements`);

    // Less than 1000 element growth is acceptable
    expect(growth).toBeLessThan(1000);
  });

  test('SESSION RECOVERY: Page should recover from errors', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    // Cause an error by executing invalid query
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.type('INVALID QUERY');
    await page.getByRole('button', { name: /execute/i }).click();
    await page.waitForTimeout(1000);

    // Now execute a valid query
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT 1;');
    await page.getByRole('button', { name: /execute/i }).click();

    // Should recover and show results
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('CONCURRENT REQUESTS: Multiple simultaneous operations should be handled', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    // Start multiple operations simultaneously
    const promises = [
      // Switch tabs
      page.getByRole('tab', { name: 'History' }).click(),
      // Try to open schema browser
      page.getByRole('button', { name: /schema/i }).click().catch(() => {}),
      // Try to validate
      page.getByRole('button', { name: /validate/i }).click().catch(() => {}),
    ];

    // All should complete without errors
    await Promise.allSettled(promises);

    await page.waitForTimeout(1000);

    // Page should still be functional
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });
});
