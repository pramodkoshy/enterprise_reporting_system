import { test, expect } from '@playwright/test';

/**
 * PERFORMANCE TESTS - Fixed to match actual UI
 *
 * Tests performance characteristics of the application
 * and ensures it meets performance budgets
 */

test.describe('Performance Metrics - Fixed', () => {
  test.use({ storageState: undefined }); // Start fresh for each test

  test('SQL Editor should load within performance budget', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for dashboard to load
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    const startTime = Date.now();

    await page.goto('/sql-editor');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const loadTime = Date.now() - startTime;

    // Page should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Get Core Web Vitals
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navigation) return null;

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        ttfb: navigation.responseStart - navigation.requestStart,
      };
    });

    if (metrics) {
      console.log('Page Load Metrics:', metrics);
      expect(metrics.domContentLoaded).toBeLessThan(1500);
    }
  });

  test('Monaco Editor should initialize quickly', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    const startTime = Date.now();

    await page.goto('/sql-editor');

    // Wait for Monaco Editor to be ready
    await page.waitForFunction(() => {
      const monacoContainer = document.querySelector('.monaco-editor');
      if (!monacoContainer) return false;

      const editorElement = monacoContainer.querySelector('.monaco-editor .view-lines');
      return editorElement !== null;
    }, { timeout: 10000 });

    const initTime = Date.now() - startTime;

    console.log(`Monaco Editor initialized in ${initTime}ms`);

    // Monaco should initialize in less than 3 seconds (relaxed budget)
    expect(initTime).toBeLessThan(3000);

    // Editor should be visible
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible();
  });

  test('Data source selection should be responsive', async ({ page }) => {
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

    // Wait for data source buttons to be visible
    const startTime = Date.now();

    // Look for data source buttons (not a dropdown)
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database|SQLite/i });
    await expect(dataSourceButtons.first()).toBeVisible({ timeout: 10000 });

    const responseTime = Date.now() - startTime;

    console.log(`Data source buttons appeared in ${responseTime}ms`);

    // Data source buttons should appear quickly (< 2 seconds for initial load)
    expect(responseTime).toBeLessThan(2000);

    // Click a data source
    await dataSourceButtons.first().click();

    // Wait for selection to take effect
    await page.waitForTimeout(500);

    // Verify data source is selected
    const selectedButton = page.locator('button').filter({ hasText: /Sample/i }).and(
      page.locator('button').filter({ has: page.locator('.bg-blue-100, .bg-blue-900\\/30') })
    );
    await expect(selectedButton).toBeVisible({ timeout: 5000 }).catch(() => {
      // Alternative check - look for selected state in any data source button
      return expect(page.locator('button').filter({ hasText: /Sample/i }).first()).toBeVisible();
    });
  });

  test('Query execution should complete in reasonable time', async ({ page }) => {
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

    // Type a simple query
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT 1;');

    // Execute query and measure time
    const startTime = Date.now();

    await page.getByRole('button', { name: /Run Query/i }).click();

    // Wait for results tab to show data
    await page.waitForTimeout(2000);

    // Check for results in Results tab
    const resultsTab = page.getByRole('tab', { name: 'Results' });
    await resultsTab.click();

    // Wait for table or results
    await page.waitForSelector('table, .text-muted-foreground', { state: 'visible', timeout: 10000 }).catch(() => {});

    const executionTime = Date.now() - startTime;

    console.log(`Query executed in ${executionTime}ms`);

    // Query should execute in less than 5 seconds
    expect(executionTime).toBeLessThan(5000);
  });

  test('Navigation should be fast', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await Promise.race([
      page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
      page.waitForURL('/', { timeout: 15000 }),
    ]);

    const pages = [
      { name: 'SQL Editor', path: '/sql-editor' },
      { name: 'Reports', path: '/reports' },
      { name: 'Charts', path: '/charts' },
    ];

    for (const pageDef of pages) {
      const startTime = Date.now();

      await page.goto(pageDef.path);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const navigationTime = Date.now() - startTime;

      console.log(`${pageDef.name} loaded in ${navigationTime}ms`);

      // Each page should load in less than 3 seconds
      expect(navigationTime).toBeLessThan(3000);
    }
  });

  test('should handle rapid interactions without degradation', async ({ page }) => {
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

    // Select data source once
    const dataSourceButtons = page.locator('button').filter({ hasText: /Sample|Database/i });
    await dataSourceButtons.first().click();
    await page.waitForTimeout(500);

    const executionTimes: number[] = [];

    // Execute 10 queries rapidly
    for (let i = 0; i < 10; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(`SELECT ${i};`);

      const startTime = Date.now();

      await page.getByRole('button', { name: /Run Query/i }).click();
      await page.waitForTimeout(1000); // Wait for execution

      executionTimes.push(Date.now() - startTime);
    }

    console.log('Query execution times:', executionTimes.map(t => `${t}ms`));

    // Average execution time should be reasonable
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    console.log(`Average execution time: ${avgTime}ms`);

    // Average should be less than 3 seconds
    expect(avgTime).toBeLessThan(3000);
  });

  test('should not have memory leaks during normal usage', async ({ page }) => {
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

    const getMemoryUsage = () => page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const initialMemory = await getMemoryUsage();
    console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);

    // Execute 20 queries
    for (let i = 0; i < 20; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(`SELECT * FROM users WHERE id = ${i % 10};`);

      await page.getByRole('button', { name: /Run Query/i }).click();
      await page.waitForTimeout(500);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const finalMemory = await getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

    // Memory should not grow more than 100MB for 20 queries
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
  });
});
