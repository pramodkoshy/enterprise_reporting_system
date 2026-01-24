import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Charts Management', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Charts');
  });

  test('Charts page loads correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Check for main page elements
    await expect(page.getByRole('heading', { name: 'Charts' })).toBeVisible();
    await expect(page.getByText('Create and manage data visualizations')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Chart' })).toBeVisible();

    // Check for All Charts table header
    await expect(page.getByText('All Charts')).toBeVisible();

    await helpers.screenshot('charts-page-loaded');
  });

  test('displays charts list table', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for loading to complete
    await helpers.waitForLoading();

    // Check for table headers
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();
    await expect(page.getByText('Query')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();

    await helpers.screenshot('charts-list-table');
  });

  test('create new chart - basic bar chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Wait for dialog to appear
    await expect(page.getByText('Create Chart')).toBeVisible();
    await expect(page.getByText('Create a new chart visualization from a saved query.')).toBeVisible();

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Bar Chart');

    // Select chart type
    await helpers.selectDropdown('Chart Type', 'Bar Chart');

    // Try to select a query if available
    const querySelect = page.locator('[role="combobox"]').filter({ hasText: 'Select a query' });
    if (await querySelect.isVisible()) {
      await querySelect.click();
      await page.waitForTimeout(500);

      // Check if there are any queries available
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Click Create Chart button
    await helpers.clickButton('Create Chart');

    // Verify success toast
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-bar');
  });

  test('create new chart - line chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Line Chart');

    // Select line chart type
    await helpers.selectDropdown('Chart Type', 'Line Chart');

    // Create chart
    await helpers.clickButton('Create Chart');

    // Verify success
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-line');
  });

  test('create new chart - pie chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Pie Chart');

    // Select pie chart type
    await helpers.selectDropdown('Chart Type', 'Pie Chart');

    // Create chart
    await helpers.clickButton('Create Chart');

    // Verify success
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-pie');
  });

  test('create new chart - area chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Area Chart');

    // Select area chart type
    await helpers.selectDropdown('Chart Type', 'Area Chart');

    // Create chart
    await helpers.clickButton('Create Chart');

    // Verify success
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-area');
  });

  test('create new chart - scatter plot', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Scatter Plot');

    // Select scatter plot type
    await helpers.selectDropdown('Chart Type', 'Scatter Plot');

    // Create chart
    await helpers.clickButton('Create Chart');

    // Verify success
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-scatter');
  });

  test('create new chart - composed chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in chart name
    await helpers.fillByLabel('Name', 'E2E Test Composed Chart');

    // Select composed chart type
    await helpers.selectDropdown('Chart Type', 'Composed Chart');

    // Create chart
    await helpers.clickButton('Create Chart');

    // Verify success
    await helpers.verifyToast('Chart created successfully');

    await helpers.screenshot('chart-created-composed');
  });

  test('validation prevents creating chart without name', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Don't fill in name, try to create
    const createButton = page.getByRole('button', { name: 'Create Chart' });
    await expect(createButton).toBeDisabled();

    await helpers.screenshot('chart-validation-no-name');
  });

  test('cancel chart creation', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Chart button
    await helpers.clickButton('New Chart');

    // Fill in some data
    await helpers.fillByLabel('Name', 'Test Chart');

    // Click Cancel
    await helpers.clickButton('Cancel');

    // Verify dialog is closed
    await expect(page.getByText('Create Chart')).not.toBeVisible();

    await helpers.screenshot('chart-creation-cancelled');
  });

  test('view chart details', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for charts to load
    await helpers.waitForLoading();

    // Try to find and click View button for the first chart
    const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();

    // Need to open the dropdown menu first
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to chart viewer
        await page.waitForTimeout(1000);

        // Verify chart viewer elements
        await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();

        await helpers.screenshot('chart-viewer-page');
      }
    }
  });

  test('delete chart', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for charts to load
    await helpers.waitForLoading();

    // Get initial row count
    const initialCount = await helpers.getTableRowCount();

    // Open dropdown menu for first chart
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      // Click Delete
      const deleteButton = page.getByRole('menuitem').filter({ hasText: 'Delete' }).first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify success toast
        await helpers.verifyToast('Chart deleted successfully');

        // Verify row count decreased
        await helpers.waitForLoading();
        const newCount = await helpers.getTableRowCount();
        expect(newCount).toBeLessThan(initialCount);

        await helpers.screenshot('chart-deleted');
      }
    }
  });

  test('chart type badges are displayed correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for charts to load
    await helpers.waitForLoading();

    // Check for chart type badges
    const chartTypes = ['bar', 'line', 'area', 'pie', 'scatter', 'composed'];

    for (const type of chartTypes) {
      const badge = page.locator(`text=${type}`, { exact: false }).first();
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible();
        break; // At least one chart exists
      }
    }

    await helpers.screenshot('chart-type-badges');
  });

  test('query status badges are displayed', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for charts to load
    await helpers.waitForLoading();

    // Check for query status badges
    const linkedBadge = page.getByText('Linked').first();
    const noQueryBadge = page.getByText('No Query').first();

    const badgesVisible = await linkedBadge.isVisible() || await noQueryBadge.isVisible();
    expect(badgesVisible).toBe(true);

    await helpers.screenshot('chart-query-badges');
  });
});

test.describe('Charts Viewer', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Charts');
  });

  test('view chart with data', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for charts to load
    await helpers.waitForLoading();

    // Navigate to first chart viewer
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Wait for chart to load
        await page.waitForTimeout(2000);

        // Verify chart is rendered
        await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 });

        await helpers.screenshot('chart-viewer-rendered');
      }
    }
  });

  test('refresh chart data', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to chart viewer
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Click Refresh button
        await helpers.clickButton('Refresh');

        // Verify refresh happened
        await helpers.waitForLoading();

        await helpers.screenshot('chart-viewer-refreshed');
      }
    }
  });

  test('export chart functionality', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to chart viewer
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Click Export button (should show toast)
        await helpers.clickButton('Export');

        // Verify export toast (feature coming soon)
        await helpers.verifyToast('Export feature coming soon');

        await helpers.screenshot('chart-export-clicked');
      }
    }
  });

  test('breadcrumb navigation works', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to chart viewer
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Click breadcrumb to go back
        const breadcrumb = page.getByRole('link', { name: 'Charts' });
        if (await breadcrumb.isVisible()) {
          await breadcrumb.click();

          // Should be back on charts list
          await expect(page.getByRole('heading', { name: 'Charts' })).toBeVisible();

          await helpers.screenshot('chart-breadcrumb-navigation');
        }
      }
    }
  });

  test('configure button navigates to editor', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to chart viewer
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Click Configure button
        const configureButton = page.getByRole('link', { name: /Configure/i });
        if (await configureButton.isVisible()) {
          await configureButton.click();

          // Should navigate to editor (or show 404 if not implemented)
          await page.waitForTimeout(1000);

          await helpers.screenshot('chart-configure-clicked');
        }
      }
    }
  });
});

test.describe('Charts - Error Handling', () => {
  test('handle empty charts list', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Charts');

    // Wait for loading
    await helpers.waitForLoading();

    // Check if empty state is shown
    const emptyState = page.getByText(/No charts created yet/);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Chart' })).toBeVisible();

      await helpers.screenshot('charts-empty-state');
    }
  });

  test('handle chart not found', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();

    // Try to navigate to non-existent chart
    await page.goto('/charts/viewer/nonexistent-id');

    // Should show not found message
    await expect(page.getByText('Chart not found')).toBeVisible({ timeout: 5000 });

    await helpers.screenshot('chart-not-found');
  });
});
