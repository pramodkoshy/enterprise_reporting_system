import { test, expect } from './fixtures/auth.fixture';

/**
 * Performance Tests
 * Ensures the application meets performance budgets and responds quickly
 */

test.describe('Performance Metrics', () => {
  test('SQL Editor should load within performance budget', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();

    await page.goto('/sql-editor');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const loadTime = Date.now() - startTime;

    // Page should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Get Core Web Vitals
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navigation) return null;

      return {
        // Time to parse HTML and construct DOM
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        // Total page load time
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        // DNS lookup time
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        // Time to first byte
        ttfb: navigation.responseStart - navigation.requestStart,
      };
    });

    if (metrics) {
      console.log('Page Load Metrics:', metrics);

      // Performance budgets
      expect(metrics.domContentLoaded).toBeLessThan(1500); // DCL < 1.5s
      expect(metrics.loadComplete).toBeLessThan(3000); // Load complete < 3s
      expect(metrics.ttfb).toBeLessThan(500); // TTFB < 500ms
    }
  });

  test('Monaco Editor should initialize quickly', async ({ authenticatedPage: page }) => {
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

    // Monaco should initialize in less than 2 seconds
    expect(initTime).toBeLessThan(2000);

    // Editor should be interactive
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible();

    // Verify it's editable
    await editor.click();
    const isEditable = await page.evaluate(() => {
      const textarea = document.querySelector('.monaco-editor textarea');
      return textarea && !textarea.disabled;
    });

    expect(isEditable).toBeTruthy();
  });

  test('Data source selection should be responsive', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    const startTime = Date.now();

    // Select data source
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
    await selectTrigger.click();

    // Wait for options to appear
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });

    const responseTime = Date.now() - startTime;

    // Dropdown should open in less than 500ms
    expect(responseTime).toBeLessThan(500);

    // Select first option
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();

    // Selection should complete quickly
    await page.waitForTimeout(500);
    await expect(page.locator('[role="option"]')).toHaveCount(0, { timeout: 5000 });
  });

  test('Query execution should complete in reasonable time', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    // Select data source
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);

    // Type a simple query
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('SELECT * FROM users LIMIT 10;');

    // Execute query and measure time
    const startTime = Date.now();

    await page.getByRole('button', { name: /execute/i }).click();

    // Wait for results
    await page.waitForSelector('table', { state: 'visible', timeout: 10000 });

    const executionTime = Date.now() - startTime;

    // Query should execute in less than 2 seconds
    expect(executionTime).toBeLessThan(2000);
  });

  test('Navigation should be fast', async ({ authenticatedPage: page }) => {
    const pages = [
      { name: 'Dashboard', path: '/' },
      { name: 'SQL Editor', path: '/sql-editor' },
      { name: 'Reports', path: '/reports' },
      { name: 'Charts', path: '/charts' },
      { name: 'Dashboards', path: '/dashboards' },
    ];

    for (const pageDef of pages) {
      const startTime = Date.now();

      await page.goto(pageDef.path);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const navigationTime = Date.now() - startTime;

      // Each page should load in less than 2 seconds
      expect(navigationTime).toBeLessThan(2000);

      console.log(`${pageDef.name} loaded in ${navigationTime}ms`);
    }
  });

  test('should handle rapid interactions without degradation', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    // Select data source once
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);

    // Execute multiple queries rapidly
    const queries = [
      'SELECT 1;',
      'SELECT 2;',
      'SELECT 3;',
      'SELECT 4;',
      'SELECT 5;',
    ];

    const times: number[] = [];

    for (const query of queries) {
      const startTime = Date.now();

      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(query);

      await page.getByRole('button', { name: /execute/i }).click();
      await page.waitForSelector('table', { state: 'visible', timeout: 10000 });

      times.push(Date.now() - startTime);
    }

    console.log('Query execution times:', times);

    // Average execution time should be reasonable
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    expect(avgTime).toBeLessThan(2000); // Average < 2s

    // No query should take more than 3 seconds
    times.forEach(time => {
      expect(time).toBeLessThan(3000);
    });
  });

  test('should not have memory leaks', async ({ authenticatedPage: page }) => {
    await page.goto('/sql-editor');

    // Select data source
    const selectTrigger = page.locator('button').filter({ hasText: /Select data source/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
    await selectTrigger.click();
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);

    const getMemoryUsage = () => page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const initialMemory = await getMemoryUsage();

    // Execute 20 queries
    for (let i = 0; i < 20; i++) {
      const editor = page.locator('.monaco-editor').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(`SELECT * FROM users LIMIT ${i + 1};`);

      await page.getByRole('button', { name: /execute/i }).click();
      await page.waitForSelector('table', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(100);
    }

    // Force garbage collection if possible
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const finalMemory = await getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

    // Memory should not grow more than 50MB after 20 queries
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});
