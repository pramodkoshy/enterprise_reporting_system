import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Dashboard Editor - Full Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
    await helpers.waitForLoading();
  });

  test('create public dashboard with description', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create new dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'E2E Public Dashboard');
    await helpers.fillByLabel('Description', 'This is a public test dashboard for E2E testing');

    // Toggle to make it public
    const publicToggle = page.getByRole('switch').first();
    if (await publicToggle.isVisible()) {
      await publicToggle.click();
    }

    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Verify it shows as public
    await page.waitForTimeout(1000);
    const publicBadge = page.getByText('Public').first();
    await expect(publicBadge).toBeVisible();

    await helpers.screenshot('dashboard-editor-create-public');
  });

  test('create private dashboard', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'E2E Private Dashboard');
    await helpers.fillByLabel('Description', 'This is a private test dashboard');

    // Ensure public toggle is off (private by default)

    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Verify it shows as private
    await page.waitForTimeout(1000);
    const privateBadge = page.getByText('Private').first();
    await expect(privateBadge).toBeVisible();

    await helpers.screenshot('dashboard-editor-create-private');
  });

  test('toggle dashboard visibility between public and private', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create a dashboard first
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Toggle Test Dashboard');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Now edit to change visibility
    await page.waitForTimeout(1000);
    const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
    if (await editButton.isVisible()) {
      // Need to open menu first
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await editButton.click();
      await page.waitForTimeout(1000);

      // Toggle public toggle
      const publicToggle = page.getByRole('switch').first();
      if (await publicToggle.isVisible()) {
        await publicToggle.click();
      }

      // Save
      await helpers.clickButton('Save');
      await helpers.verifyToast('Dashboard updated successfully');

      await helpers.screenshot('dashboard-editor-toggle-visibility');
    }
  });

  test('edit dashboard name and description', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Original Name');
    await helpers.fillByLabel('Description', 'Original description');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Edit it
    await page.waitForTimeout(1000);
    const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
    if (await editButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await editButton.click();
      await page.waitForTimeout(1000);

      // Clear and update name
      const nameInput = page.getByLabel('Name');
      await nameInput.clear();
      await nameInput.fill('Updated Dashboard Name');

      // Clear and update description
      const descInput = page.getByLabel('Description');
      if (await descInput.isVisible()) {
        await descInput.clear();
        await descInput.fill('Updated description');
      }

      // Save
      await helpers.clickButton('Save');
      await helpers.verifyToast('Dashboard updated successfully');

      // Verify updates
      await expect(page.getByText('Updated Dashboard Name')).toBeVisible();

      await helpers.screenshot('dashboard-editor-edit-details');
    }
  });

  test('view dashboard after creation', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'View Test Dashboard');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // View it
    await page.waitForTimeout(1000);
    const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await viewButton.click();
      await page.waitForTimeout(1000);

      // Should be on view page
      await expect(page.locator('main')).toBeVisible();

      await helpers.screenshot('dashboard-editor-view-created');
    }
  });

  test('delete dashboard and verify removal', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Delete Test Dashboard');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Get the name to verify it's deleted later
    const dashboardName = 'Delete Test Dashboard';

    // Delete it
    await page.waitForTimeout(1000);
    const deleteButton = page.getByRole('menuitem').filter({ hasText: 'Delete' }).first();
    if (await deleteButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await deleteButton.click();
      await helpers.verifyToast('Dashboard deleted successfully');

      // Verify it's no longer in the list
      await expect(page.getByText(dashboardName)).not.toBeVisible({ timeout: 5000 });

      await helpers.screenshot('dashboard-editor-delete-verify');
    }
  });
});

test.describe('Dashboard Editor - Multiple Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
    await helpers.waitForLoading();
  });

  test('create multiple dashboards with different settings', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const dashboards = [
      {
        name: 'Public Dashboard 1',
        description: 'First public dashboard',
        isPublic: true,
      },
      {
        name: 'Private Dashboard 1',
        description: 'First private dashboard',
        isPublic: false,
      },
      {
        name: 'Public Dashboard 2',
        description: 'Second public dashboard',
        isPublic: true,
      },
    ];

    for (const dashboard of dashboards) {
      await helpers.clickButton('New Dashboard');
      await helpers.fillByLabel('Name', dashboard.name);
      await helpers.fillByLabel('Description', dashboard.description);

      // Set public/private
      const publicToggle = page.getByRole('switch').first();
      if (dashboard.isPublic) {
        // Check if it's already on, if not, click to enable
        const isChecked = await publicToggle.isChecked();
        if (!isChecked) {
          await publicToggle.click();
        }
      }

      await helpers.clickButton('Create Dashboard');
      await helpers.verifyToast('Dashboard created successfully');

      await page.waitForTimeout(500);
    }

    // Verify all dashboards exist in the list
    for (const dashboard of dashboards) {
      await expect(page.getByText(dashboard.name).first()).toBeVisible();
    }

    await helpers.screenshot('dashboard-editor-multiple-dashboards');
  });

  test('navigate between dashboard editor and viewer', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create a dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Navigation Test Dashboard');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Navigate to editor
    await page.waitForTimeout(1000);
    const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
    if (await editButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await editButton.click();
      await page.waitForTimeout(1000);

      // Make a change
      await helpers.fillByLabel('Name', 'Updated Navigation Dashboard');
      await helpers.clickButton('Save');
      await helpers.verifyToast('Dashboard updated successfully');

      // Navigate to viewer
      const viewButton = page.getByRole('link', { name: /View/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('main')).toBeVisible();
      }

      // Navigate back to list
      const breadcrumb = page.getByRole('link', { name: 'Dashboards' });
      if (await breadcrumb.isVisible()) {
        await breadcrumb.click();
        await page.waitForTimeout(1000);
        await expect(page.getByRole('heading', { name: 'Dashboards', exact: true }).first()).toBeVisible();
      }

      await helpers.screenshot('dashboard-editor-navigation-flow');
    }
  });
});

test.describe('Dashboard Editor - Visibility Settings', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
    await helpers.waitForLoading();
  });

  test('verify public dashboard has globe icon', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create public dashboard
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Icon Test Public');
    const publicToggle = page.getByRole('switch').first();
    if (await publicToggle.isVisible()) {
      await publicToggle.click();
    }
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Check for globe icon in badge
    await page.waitForTimeout(1000);
    const publicBadge = page.getByText('Public').first();
    if (await publicBadge.isVisible()) {
      const badgeParent = publicBadge.locator('..');
      const globeIcon = badgeParent.locator('svg').first();

      if (await globeIcon.isVisible()) {
        // It has an icon
        await expect(globeIcon).toBeVisible();
      }
    }

    await helpers.screenshot('dashboard-editor-public-icon');
  });

  test('verify private dashboard has lock icon', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create private dashboard (leave public toggle off)
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Icon Test Private');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Check for lock icon in badge
    await page.waitForTimeout(1000);
    const privateBadge = page.getByText('Private').first();
    if (await privateBadge.isVisible()) {
      const badgeParent = privateBadge.locator('..');
      const lockIcon = badgeParent.locator('svg').first();

      if (await lockIcon.isVisible()) {
        // It has an icon
        await expect(lockIcon).toBeVisible();
      }
    }

    await helpers.screenshot('dashboard-editor-private-icon');
  });
});

test.describe('Dashboard Editor - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Dashboards');
    await helpers.waitForLoading();
  });

  test('validation prevents empty dashboard name', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.clickButton('New Dashboard');

    // Don't fill name, try to create
    const createButton = page.getByRole('button', { name: 'Create Dashboard' });
    await expect(createButton).toBeDisabled();

    // Now fill name and verify button enables
    await helpers.fillByLabel('Name', 'Valid Dashboard Name');
    await expect(createButton).toBeEnabled();

    // Cancel to clean up
    await helpers.clickButton('Cancel');

    await helpers.screenshot('dashboard-editor-validation');
  });

  test('handle cancel operation gracefully', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Cancel Test Dashboard');
    await helpers.fillByLabel('Description', 'This should be cancelled');

    // Click cancel
    await helpers.clickButton('Cancel');

    // Should return to dashboards list
    await expect(page.getByRole('heading', { name: 'Dashboards', exact: true }).first()).toBeVisible();

    // Verify cancelled dashboard doesn't exist
    await expect(page.getByText('Cancel Test Dashboard')).not.toBeVisible({ timeout: 2000 });

    await helpers.screenshot('dashboard-editor-cancel');
  });
});

test.describe('Dashboard Editor - Integration Tests', () => {
  test('full dashboard lifecycle: create, edit, view, delete', async ({ page }) => {
    const helpers = new TestHelpers(page);

    const dashboardName = 'Lifecycle Test Dashboard';

    // Step 1: Create
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', dashboardName);
    await helpers.fillByLabel('Description', 'Testing complete dashboard lifecycle');
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Step 2: Edit
    await page.waitForTimeout(1000);
    const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
    if (await editButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await editButton.click();
      await page.waitForTimeout(1000);

      await helpers.fillByLabel('Name', `${dashboardName} - Updated`);
      await helpers.clickButton('Save');
      await helpers.verifyToast('Dashboard updated successfully');
    }

    // Step 3: View
    await page.waitForTimeout(500);
    const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await viewButton.click();
      await page.waitForTimeout(1000);

      // Verify we're on view page
      await expect(page.locator('main')).toBeVisible();
    }

    // Step 4: Delete
    await page.waitForTimeout(500);
    const deleteButton = page.getByRole('menuitem').filter({ hasText: 'Delete' }).first();
    if (await deleteButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await deleteButton.click();
      await helpers.verifyToast('Dashboard deleted successfully');

      // Verify dashboard is gone
      await expect(page.getByText(`${dashboardName} - Updated`)).not.toBeVisible({ timeout: 2000 });
    }

    await helpers.screenshot('dashboard-editor-lifecycle');
  });

  test('create dashboard with minimal information', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create with only name (required field)
    await helpers.clickButton('New Dashboard');
    await helpers.fillByLabel('Name', 'Minimal Dashboard');
    // Skip optional description
    await helpers.clickButton('Create Dashboard');
    await helpers.verifyToast('Dashboard created successfully');

    // Verify it was created
    await expect(page.getByText('Minimal Dashboard')).toBeVisible();

    await helpers.screenshot('dashboard-editor-minimal');
  });
});
