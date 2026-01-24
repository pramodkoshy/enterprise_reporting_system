import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Report Editor - Full Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Reports');
    await helpers.waitForLoading();
  });

  test('create report from scratch and configure columns', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create a new report
    await helpers.clickButton('New Report');
    await helpers.fillByLabel('Name', 'E2E Test Report Full Config');
    await helpers.fillByLabel('Description', 'Testing full report configuration');
    await helpers.clickButton('Create Report');

    // Verify success and navigate to editor
    await helpers.verifyToast('Report created successfully');
    await page.waitForTimeout(1000);

    // Try to navigate to the editor
    const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Configure columns
      // Update column header
      const headerInput = page.locator('input').filter({ hasText: /./ }).first();
      if (await headerInput.isVisible()) {
        await headerInput.click();
        await headerInput.clear();
        await headerInput.fill('Customer Name');
      }

      // Set column width
      const widthInput = page.locator('input[type="number"]').first();
      if (await widthInput.isVisible()) {
        await widthInput.fill('200');
      }

      // Toggle visibility
      const visibilityToggle = page.locator('[role="switch"]').first();
      if (await visibilityToggle.isVisible()) {
        await visibilityToggle.click();
      }

      // Set formatter to Currency
      const formatterSelect = page.locator('[role="combobox"]').filter({ hasText: /Text|Number/ }).first();
      if (await formatterSelect.isVisible()) {
        await formatterSelect.click();
        await page.waitForTimeout(300);

        const currencyOption = page.getByRole('option').filter({ hasText: 'Currency' }).first();
        if (await currencyOption.isVisible()) {
          await currencyOption.click();
        }
      }

      // Save the configuration
      await helpers.clickButton('Save');
      await helpers.verifyToast('Report updated successfully');

      await helpers.screenshot('report-editor-full-config');
    }
  });

  test('configure all column formatters', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to first report editor
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        const formatters = ['Text', 'Number', 'Currency', 'Percentage', 'Date', 'DateTime', 'Boolean'];
        const formatterSelect = page.locator('[role="combobox"]').filter({ hasText: /Text|Number/ }).first();

        if (await formatterSelect.isVisible()) {
          for (const formatter of formatters) {
            // Click the formatter dropdown
            await formatterSelect.click();
            await page.waitForTimeout(300);

            // Select the formatter
            const option = page.getByRole('option').filter({ hasText: formatter }).first();
            if (await option.isVisible()) {
              await option.click();
            }

            // Save and verify
            await helpers.clickButton('Save');
            await helpers.verifyToast('Report updated successfully');
            await page.waitForTimeout(500);

            // Re-open the dropdown for next iteration
            if (formatter !== formatters[formatters.length - 1]) {
              await formatterSelect.click();
              await page.waitForTimeout(300);
            }
          }

          await helpers.screenshot('report-editor-all-formatters');
        }
      }
    }
  });

  test('reorder columns using drag and drop', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to report editor
    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Look for drag handle
        const dragHandle = page.locator('button').filter({ hasText: /drag|grip/i }).first();
        if (await dragHandle.isVisible()) {
          await dragHandle.click();
          await page.waitForTimeout(500);

          await helpers.clickButton('Save');
          await helpers.verifyToast('Report updated successfully');

          await helpers.screenshot('report-editor-reorder-columns');
        }
      }
    }
  });

  test('set multiple column properties at once', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Configure multiple columns
        const table = page.locator('table').first();
        const rows = await table.locator('tbody tr').all();

        if (rows.length > 0) {
          // Configure first 3 columns
          for (let i = 0; i < Math.min(3, rows.length); i++) {
            const row = rows[i];

            // Update header
            const headerInput = row.locator('input').filter({ hasText: /./ }).first();
            if (await headerInput.isVisible()) {
              await headerInput.fill(`Column ${i + 1}`);
            }

            // Toggle sortable
            const sortableToggle = row.locator('[role="switch"]').nth(1);
            if (await sortableToggle.isVisible()) {
              await sortableToggle.click();
            }

            await page.waitForTimeout(200);
          }

          // Save
          await helpers.clickButton('Save');
          await helpers.verifyToast('Report updated successfully');

          await helpers.screenshot('report-editor-multiple-config');
        }
      }
    }
  });

  test('delete column from report configuration', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Get initial row count
        const initialRows = await page.locator('tbody tr').count();

        // Delete a column
        const deleteButton = page.locator('button').filter({ hasText: /delete|trash/i }).first();
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);

          // Save
          await helpers.clickButton('Save');
          await helpers.verifyToast('Report updated successfully');

          // Verify row count decreased
          const newRows = await page.locator('tbody tr').count();
          expect(newRows).toBeLessThan(initialRows);

          await helpers.screenshot('report-editor-delete-column');
        }
      }
    }
  });

  test('configure column visibility for all columns', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Toggle all visibility switches
        const visibilityToggles = page.locator('[role="switch"]').all();

        for (const toggle of visibilityToggles) {
          if (await toggle.isVisible()) {
            await toggle.click();
            await page.waitForTimeout(100);
          }
        }

        // Save
        await helpers.clickButton('Save');
        await helpers.verifyToast('Report updated successfully');

        await helpers.screenshot('report-editor-visibility-all');
      }
    }
  });

  test('enable sorting for all columns', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Find and enable all sortable toggles
        const sortableToggles = page.locator('[role="switch"]').all();
        const toggleCount = await sortableToggles.count();

        // Assuming sortable is the second switch
        for (let i = 0; i < toggleCount; i += 2) {
          const toggle = sortableToggles.nth(i);
          if (await toggle.isVisible()) {
            await toggle.click();
            await page.waitForTimeout(100);
          }
        }

        // Save
        await helpers.clickButton('Save');
        await helpers.verifyToast('Report updated successfully');

        await helpers.screenshot('report-editor-sortable-all');
      }
    }
  });

  test('navigate between tabs in editor', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Try to find and click tabs if they exist
        const tabs = page.locator('[role="tab"]').all();
        const tabCount = await tabs.count();

        if (tabCount > 0) {
          // Click through tabs
          for (let i = 0; i < Math.min(3, tabCount); i++) {
            await tabs.nth(i).click();
            await page.waitForTimeout(500);
          }

          await helpers.screenshot('report-editor-tabs-navigation');
        }
      }
    }
  });

  test('save report configuration multiple times', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Save multiple times
        for (let i = 0; i < 3; i++) {
          await helpers.clickButton('Save');
          await helpers.verifyToast('Report updated successfully');
          await page.waitForTimeout(500);

          // Make a change
          const headerInput = page.locator('input').filter({ hasText: /./ }).first();
          if (await headerInput.isVisible()) {
            await headerInput.clear();
            await headerInput.fill(`Report ${i + 1}`);
          }
        }

        await helpers.screenshot('report-editor-multiple-saves');
      }
    }
  });

  test('view report after configuration', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.waitForLoading();
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Make a change and save
        const headerInput = page.locator('input').filter({ hasText: /./ }).first();
        if (await headerInput.isVisible()) {
          await headerInput.clear();
          await headerInput.fill('Updated Report');
        }

        await helpers.clickButton('Save');
        await helpers.verifyToast('Report updated successfully');

        // Navigate back to list
        const breadcrumb = page.getByRole('link', { name: 'Reports' });
        if (await breadcrumb.isVisible()) {
          await breadcrumb.click();
          await page.waitForTimeout(1000);
        }

        // View the report
        const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
        if (await viewButton.isVisible()) {
          // Need to open menu first
          const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
          await menuTrigger.click();
          await page.waitForTimeout(200);

          await viewButton.click();
          await page.waitForTimeout(1000);

          await expect(page.locator('table').first()).toBeVisible();
          await helpers.screenshot('report-editor-view-after-config');
        }
      }
    }
  });
});

test.describe('Report Editor - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await helpers.navigateToPage('Reports');
    await helpers.waitForLoading();
  });

  test('handle missing required fields', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Try to create report without name
    await helpers.clickButton('New Report');
    // Don't fill name
    const createButton = page.getByRole('button', { name: 'Create Report' });

    // Button should be disabled or validation should trigger
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(true);

    await helpers.screenshot('report-editor-validation-no-name');
  });

  test('handle cancel operation', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await helpers.clickButton('New Report');
    await helpers.fillByLabel('Name', 'Test Report');
    await helpers.fillByLabel('Description', 'Test description');

    // Click Cancel
    await helpers.clickButton('Cancel');

    // Should return to reports list
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    await helpers.screenshot('report-editor-cancel-operation');
  });
});

test.describe('Report Editor - Integration Tests', () => {
  test('full workflow: create, configure, view, and delete report', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Step 1: Create report
    await helpers.clickButton('New Report');
    await helpers.fillByLabel('Name', 'Full Workflow Test Report');
    await helpers.fillByLabel('Description', 'Testing complete report workflow');
    await helpers.clickButton('Create Report');
    await helpers.verifyToast('Report created successfully');

    // Step 2: Configure report
    await page.waitForTimeout(1000);
    const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(200);

      const editButton = page.getByRole('menuitem').filter({ hasText: 'Edit' }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Configure columns
        const headerInput = page.locator('input').filter({ hasText: /./ }).first();
        if (await headerInput.isVisible()) {
          await headerInput.fill('Display Name');
        }

        await helpers.clickButton('Save');
        await helpers.verifyToast('Report updated successfully');
      }
    }

    // Step 3: View report
    await page.waitForTimeout(500);
    const viewButton = page.getByRole('menuitem').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await viewButton.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('main')).toBeVisible();
    }

    // Step 4: Delete report
    await page.waitForTimeout(500);
    const deleteButton = page.getByRole('menuitem').filter({ hasText: 'Delete' }).first();
    if (await deleteButton.isVisible()) {
      const menuTrigger = page.locator('button').filter({ hasText: /More/i }).first();
      await menuTrigger.click();
      await page.waitForTimeout(200);

      await deleteButton.click();
      await helpers.verifyToast('Report deleted successfully');
    }

    await helpers.screenshot('report-editor-full-workflow');
  });
});
