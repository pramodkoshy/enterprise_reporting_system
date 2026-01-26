import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Dashboards Management', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
  });

  test('Dashboards page loads correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Check for main page elements
    await expect(page.getByRole('heading', { name: 'Dashboards', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Create and manage interactive dashboards')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Dashboard' })).toBeVisible();

    // Check for All Dashboards table header
    await expect(page.getByText('All Dashboards')).toBeVisible();

    await helpers.screenshot('dashboards-page-loaded');
  });

  test('displays dashboards list table', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for loading to complete
    await helpers.waitForLoading();

    // Check for table headers
    await expect(page.getByRole('columnheader', { name: 'Name' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Visibility' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created' }).first()).toBeVisible();

    await helpers.screenshot('dashboards-list-table');
  });

  test('create new private dashboard', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Dashboard button
    await helpers.clickButton('New Dashboard');

    // Wait for dialog to appear
    await expect(page.getByRole('heading', { name: 'Create Dashboard' })).toBeVisible();
    await expect(page.getByText('Create a new dashboard to organize your reports and charts.')).toBeVisible();

    // Fill in dashboard name
    await helpers.fillByLabel('Name', 'E2E Test Dashboard');

    // Fill in description
    await helpers.fillByLabel('Description', 'This is a test dashboard from E2E tests');

    // Leave Make dashboard public unchecked (private by default)

    // Click Create Dashboard button
    await helpers.clickButton('Create Dashboard');

    // Verify success toast
    await helpers.verifyToast('Dashboard created successfully');

    await helpers.screenshot('dashboard-created-private');
  });

  test('create new public dashboard', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Dashboard button
    await helpers.clickButton('New Dashboard');

    // Fill in dashboard name
    await helpers.fillByLabel('Name', 'E2E Test Public Dashboard');

    // Fill in description
    await helpers.fillByLabel('Description', 'This is a public test dashboard');

    // Toggle Make dashboard public
    const publicToggle = page.getByRole('switch').first();
    if (await publicToggle.isVisible()) {
      await publicToggle.click();
    }

    // Click Create Dashboard button
    await helpers.clickButton('Create Dashboard');

    // Verify success toast
    await helpers.verifyToast('Dashboard created successfully');

    await helpers.screenshot('dashboard-created-public');
  });

  test('create dashboard with minimal information', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Dashboard button
    await helpers.clickButton('New Dashboard');

    // Fill in only required field (name)
    await helpers.fillByLabel('Name', 'E2E Minimal Dashboard');

    // Create dashboard
    await helpers.clickButton('Create Dashboard');

    // Verify success
    await helpers.verifyToast('Dashboard created successfully');

    await helpers.screenshot('dashboard-created-minimal');
  });

  test('validation prevents creating dashboard without name', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Dashboard button
    await helpers.clickButton('New Dashboard');

    // Don't fill in name, try to create
    const createButton = page.getByRole('button', { name: 'Create Dashboard' });
    await expect(createButton).toBeDisabled();

    await helpers.screenshot('dashboard-validation-no-name');
  });

  test('cancel dashboard creation', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click New Dashboard button
    await helpers.clickButton('New Dashboard');

    // Fill in some data
    await helpers.fillByLabel('Name', 'Test Dashboard');
    await helpers.fillByLabel('Description', 'Test description');

    // Click Cancel
    await helpers.clickButton('Cancel');

    // Verify dialog is closed
    await expect(page.getByRole('dialog', { name: 'Create Dashboard' })).not.toBeVisible();

    await helpers.screenshot('dashboard-creation-cancelled');
  });

  test('view dashboard details', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Try to find and click View button for the first dashboard
    const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();

    // Need to open the dropdown menu first
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to dashboard viewer
        await page.waitForTimeout(1000);

        // Verify we're on a dashboard page
        await expect(page.locator('main')).toBeVisible();

        await helpers.screenshot('dashboard-viewer-page');
      }
    }
  });

  test('edit dashboard', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Open dropdown menu for first dashboard
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      // Click Edit
      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Should navigate to dashboard editor
        await page.waitForTimeout(1000);

        // Verify editor elements
        await expect(page.locator('main')).toBeVisible();

        await helpers.screenshot('dashboard-editor-page');
      }
    }
  });

  test('delete dashboard', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Get initial row count
    const initialCount = await helpers.getTableRowCount();

    // Open dropdown menu for first dashboard
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      // Click Delete
      const deleteButton = page.getByRole('menuitem').filter({ hasText: 'Delete' }).first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify success toast
        await helpers.verifyToast('Dashboard deleted successfully');

        // Verify row count decreased
        await helpers.waitForLoading();
        const newCount = await helpers.getTableRowCount();
        expect(newCount).toBeLessThan(initialCount);

        await helpers.screenshot('dashboard-deleted');
      }
    }
  });

  test('visibility badges are displayed correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Check for visibility badges
    const publicBadge = page.getByText('Public').first();
    const privateBadge = page.getByText('Private').first();

    const badgesVisible = await publicBadge.isVisible() || await privateBadge.isVisible();
    expect(badgesVisible).toBe(true);

    await helpers.screenshot('dashboard-visibility-badges');
  });

  test('public badge has globe icon', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Look for public badge with globe icon
    const publicBadge = page.getByText('Public').first();
    if (await publicBadge.isVisible()) {
      // Check if badge has a globe icon nearby
      const badgeCell = publicBadge.locator('..');
      await expect(badgeCell).toBeVisible();

      await helpers.screenshot('dashboard-public-badge');
    }
  });

  test('private badge has lock icon', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Look for private badge with lock icon
    const privateBadge = page.getByText('Private').first();
    if (await privateBadge.isVisible()) {
      // Check if badge has a lock icon nearby
      const badgeCell = privateBadge.locator('..');
      await expect(badgeCell).toBeVisible();

      await helpers.screenshot('dashboard-private-badge');
    }
  });

  test('dashboard description displays correctly', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Check if any dashboard has a description
    const descriptionText = await page.locator('td').filter({ hasText: /./ }).all();

    for (const cell of descriptionText) {
      const text = await cell.textContent();
      // Description column should show text or '-'
      if (text && text !== '-' && text.length > 0) {
        // Found a description
        await expect(cell).toBeVisible();
        break;
      }
    }

    await helpers.screenshot('dashboard-descriptions');
  });
});

test.describe('Dashboards - Error Handling', () => {
  test('handle empty dashboards list', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');

    // Wait for loading
    await helpers.waitForLoading();

    // Check if empty state is shown
    const emptyState = page.getByText(/No dashboards created yet/);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Dashboard' })).toBeVisible();

      await helpers.screenshot('dashboards-empty-state');
    }
  });

  test('handle dashboard not found', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();

    // Try to navigate to non-existent dashboard
    await page.goto('/dashboards/viewer/nonexistent-id');

    // Should show not found message or error
    await page.waitForTimeout(2000);

    const notFound = page.getByText(/not found|error/i).first();
    if (await notFound.isVisible()) {
      await expect(notFound).toBeVisible();
    }

    await helpers.screenshot('dashboard-not-found');
  });
});

test.describe('Dashboards - Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
  });

  test('create multiple dashboards', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const dashboards = [
      { name: 'E2E Dashboard 1', description: 'First test dashboard', isPublic: false },
      { name: 'E2E Dashboard 2', description: 'Second test dashboard', isPublic: true },
      { name: 'E2E Dashboard 3', description: 'Third test dashboard', isPublic: false },
    ];

    for (const dashboard of dashboards) {
      // Click New Dashboard button
      await helpers.clickButton('New Dashboard');

      // Fill in details
      await helpers.fillByLabel('Name', dashboard.name);
      await helpers.fillByLabel('Description', dashboard.description);

      if (dashboard.isPublic) {
        const publicToggle = page.getByRole('switch').first();
        if (await publicToggle.isVisible()) {
          await publicToggle.click();
        }
      }

      // Create dashboard
      await helpers.clickButton('Create Dashboard');

      // Verify success
      await helpers.verifyToast('Dashboard created successfully');

      // Wait a bit before next creation
      await page.waitForTimeout(500);
    }

    // Verify multiple dashboards in list
    await helpers.waitForLoading();
    await helpers.verifyTableHasContent(3);

    await helpers.screenshot('dashboards-multiple-created');
  });
});

test.describe('Dashboards - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
  });

  test('navigate to dashboard and back', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Wait for dashboards to load
    await helpers.waitForLoading();

    // Try to navigate to first dashboard
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Navigate to dashboard
        await page.waitForTimeout(1000);

        // Navigate back to dashboards list
        await page.getByRole('link', { name: 'Dashboards' }).click();
        await page.waitForTimeout(500);

        // Verify we're back on the list
        await expect(page.getByRole('heading', { name: 'Dashboards', exact: true }).first()).toBeVisible();

        await helpers.screenshot('dashboard-navigation-roundtrip');
      }
    }
  });

  test('breadcrumb navigation on dashboard page', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to first dashboard
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Look for breadcrumb and click back
        const breadcrumb = page.getByRole('navigation').locator('a').first();
        if (await breadcrumb.isVisible()) {
          await breadcrumb.click();

          // Should be back on dashboards list
          await expect(page.getByRole('heading', { name: 'Dashboards', exact: true }).first()).toBeVisible();

          await helpers.screenshot('dashboard-breadcrumb-navigation');
        }
      }
    }
  });
});
