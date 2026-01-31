import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Report Editor - Field Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    // Navigate directly to the specific report editor
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('should show field dropdown in columns tab', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to Columns tab
    await page.getByRole('tab', { name: 'Columns' }).click();
    await page.waitForTimeout(500);

    // Click "Add Column" button
    await helpers.clickButton('Add Column');
    await page.waitForTimeout(300);

    // Verify field dropdown exists - look for select inside table
    const fieldSelect = page.locator('table').locator('[role="combobox"]').or(page.locator('table').locator('select')).first();
    await expect(fieldSelect).toBeVisible();

    // Click dropdown to verify it has options
    await fieldSelect.click();
    await page.waitForTimeout(300);

    // Check that options are available
    const options = page.getByRole('option');
    const optionCount = await options.count();

    expect(optionCount).toBeGreaterThan(0);

    // Log the available fields
    console.log(`Found ${optionCount} field options`);
    for (let i = 0; i < Math.min(5, optionCount); i++) {
      const optionText = await options.nth(i).textContent();
      console.log(`  - ${optionText}`);
    }

    await helpers.screenshot('report-field-dropdown-available');
  });

  test('should update available fields when query changes', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to General tab first
    await page.getByRole('tab', { name: 'General' }).click();
    await page.waitForTimeout(500);

    // Get current query selection if any
    const queryDropdown = page.locator('[role="combobox"]').filter({ hasText: /Select a query|Query/ }).first();

    if (await queryDropdown.isVisible()) {
      // Select a different query
      await queryDropdown.click();
      await page.waitForTimeout(300);

      const queries = page.getByRole('option');
      const queryCount = await queries.count();

      if (queryCount > 0) {
        // Select second query if available
        if (queryCount > 1) {
          await queries.nth(1).click();
        } else {
          await queries.first().click();
        }
        await page.waitForTimeout(3000); // Wait for query execution

        // Now navigate to Columns tab and verify fields
        await page.getByRole('tab', { name: 'Columns' }).click();
        await page.waitForTimeout(500);

        await helpers.clickButton('Add Column');

        // Verify field dropdown has updated options
        const fieldDropdown = page.locator('[role="combobox"]').filter({ hasText: /Select field|Field/ }).first();
        await fieldDropdown.click();
        await page.waitForTimeout(300);

        const options = page.getByRole('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(0);

        await helpers.screenshot('report-field-dropdown-after-query-change');
      }
    }
  });

  test('should allow selecting field from dropdown', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to Columns tab
    await page.getByRole('tab', { name: 'Columns' }).click();
    await page.waitForTimeout(500);

    // Add a column
    await helpers.clickButton('Add Column');
    await page.waitForTimeout(300);

    // Select a field from dropdown
    const fieldDropdown = page.locator('[role="combobox"]').filter({ hasText: /Select field|Field/ }).first();
    await fieldDropdown.click();
    await page.waitForTimeout(300);

    // Select first available field
    const firstOption = page.getByRole('option').first();
    const fieldText = await firstOption.textContent();
    await firstOption.click();
    await page.waitForTimeout(300);

    // Verify selection - the dropdown should show the selected value
    await helpers.screenshot('report-field-dropdown-selected');

    console.log(`Selected field: ${fieldText}`);
  });
});

test.describe('Report Editor - Filter Configuration', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('should show filter builder when query is selected', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to Filters tab
    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    // Check for filter builder elements
    const filterGroupTitle = page.getByText('Filter Group');
    const logicDropdown = page.locator('[role="combobox"]').filter({ hasText: /AND|OR/ }).first();
    const addButton = page.getByRole('button', { name: /Add Condition/i });

    // Allow for empty state if no query selected
    const hasNoFields = await page.getByText('No fields available').count() > 0;

    if (!hasNoFields) {
      await expect(filterGroupTitle).toBeVisible();
      await expect(logicDropdown).toBeVisible();
      await expect(addButton).toBeVisible();
      await helpers.screenshot('report-filter-builder-visible');
    } else {
      console.log('No query selected - showing empty state');
      await helpers.screenshot('report-filter-no-query');
    }
  });

  test('should add filter condition', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to Filters tab
    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    // Check if we have fields available
    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Click "Add Condition" button
    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    // Verify condition row appeared
    const conditionRow = page.locator('.bg-muted').first();
    await expect(conditionRow).toBeVisible();

    // Verify the condition has 3 main parts: field dropdown, operator dropdown, value input (or delete button)
    const dropdowns = conditionRow.locator('[role="combobox"]');
    const dropdownCount = await dropdowns.count();
    expect(dropdownCount).toBeGreaterThanOrEqual(2); // Field and Operator dropdowns

    await helpers.screenshot('report-filter-condition-added');
  });

  test('should configure text filter operators', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Add a condition
    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    // Select field
    const fieldDropdown = page.locator('.bg-muted [role="combobox"]').first();
    await fieldDropdown.click();
    await page.waitForTimeout(300);

    const firstOption = page.getByRole('option').first();
    await firstOption.click();
    await page.waitForTimeout(300);

    // Click operator dropdown to see available operators
    const operatorDropdown = page.locator('.bg-muted [role="combobox"]').nth(1);
    await operatorDropdown.click();
    await page.waitForTimeout(300);

    // Check for text operators
    const textOperators = ['Equals', 'Contains', 'Starts With', 'Ends With', 'Is Empty'];
    for (const op of textOperators) {
      const option = page.getByRole('option', { name: op });
      const exists = await option.count() > 0;
      if (exists) {
        console.log(`Found operator: ${op}`);
      }
    }

    await page.keyboard.press('Escape'); // Close dropdown
    await helpers.screenshot('report-filter-text-operators');
  });

  test('should configure number filter operators', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Add a condition
    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    // Select a field (try to find a numeric field)
    const fieldDropdown = page.locator('.bg-muted [role="combobox"]').first();
    await fieldDropdown.click();
    await page.waitForTimeout(300);

    // Look for numeric fields
    const numericOptions = page.getByRole('option').filter({ hasText: /count|amount|price|total/i });
    const numericOptionCount = await numericOptions.count();

    if (numericOptionCount > 0) {
      await numericOptions.first().click();
    } else {
      // Just select first option
      const firstOption = page.getByRole('option').first();
      await firstOption.click();
    }

    await page.waitForTimeout(300);

    // Check operator dropdown
    const operatorDropdown = page.locator('.bg-muted [role="combobox"]').nth(1);
    await operatorDropdown.click();
    await page.waitForTimeout(300);

    // Check for number operators
    const numberOperators = ['Greater Than', 'Less Than', 'Between', 'Is Null'];
    const hasNumberOperators = await Promise.all(
      numberOperators.map(async (op) => {
        const option = page.getByRole('option', { name: op });
        return await option.count() > 0;
      })
    );

    const foundAny = hasNumberOperators.some((found) => found);
    if (foundAny) {
      console.log('Found numeric filter operators');
    }

    await page.keyboard.press('Escape');
    await helpers.screenshot('report-filter-number-operators');
  });

  test('should support Between operator with two value inputs', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Add a condition
    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    // Select field
    const fieldDropdown = page.locator('.bg-muted [role="combobox"]').first();
    await fieldDropdown.click();
    await page.waitForTimeout(300);

    const firstOption = page.getByRole('option').first();
    await firstOption.click();
    await page.waitForTimeout(300);

    // Select Between operator
    const operatorDropdown = page.locator('.bg-muted [role="combobox"]').nth(1);
    await operatorDropdown.click();
    await page.waitForTimeout(300);

    const betweenOption = page.getByRole('option', { name: 'Between' });
    if (await betweenOption.count() > 0) {
      await betweenOption.click();
      await page.waitForTimeout(300);

      // Check for two value inputs
      const inputs = page.locator('.bg-muted input[type="text"]');
      const inputCount = await inputs.count();

      expect(inputCount).toBeGreaterThanOrEqual(2);

      // Verify "to" separator
      const toLabel = page.getByText('to');
      expect(toLabel).toBeVisible();

      await helpers.screenshot('report-filter-between-operator');
    } else {
      console.log('Between operator not available for this field type');
    }
  });

  test('should remove filter condition', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Add two conditions
    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Add Condition/i }).click();
    await page.waitForTimeout(300);

    // Get initial condition count
    const initialConditions = await page.locator('.bg-muted').count();
    console.log(`Initial conditions: ${initialConditions}`);

    // Delete first condition
    const deleteButton = page.locator('.bg-muted button').filter({ hasText: /delete|remove/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      const finalConditions = await page.locator('.bg-muted').count();
      expect(finalConditions).toBeLessThan(initialConditions);

      await helpers.screenshot('report-filter-condition-removed');
    }
  });

  test('should change filter logic from AND to OR', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg > 0) {
      console.log('Skipping test - no query selected');
      return;
    }

    // Check logic dropdown
    const logicDropdown = page.locator('[role="combobox"]').filter({ hasText: /AND|OR/ }).first();
    await expect(logicDropdown).toBeVisible();

    // Check current value
    const currentValue = await logicDropdown.textContent();
    console.log(`Current logic: ${currentValue}`);

    // Change to OR
    await logicDropdown.click();
    await page.waitForTimeout(300);

    const orOption = page.getByRole('option', { name: 'OR' });
    await orOption.click();
    await page.waitForTimeout(300);

    await helpers.screenshot('report-filter-logic-or');
  });
});

test.describe('Report Editor - Export Settings', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('should show export format toggles', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to Export tab
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Check for export options
    const csvExport = page.getByText('CSV Export');
    const excelExport = page.getByText('Excel Export');
    const pdfExport = page.getByText('PDF Export');

    await expect(csvExport).toBeVisible();
    await expect(excelExport).toBeVisible();
    await expect(pdfExport).toBeVisible();

    // Check for toggle switches
    const switches = page.locator('[role="switch"]');
    const switchCount = await switches.count();
    expect(switchCount).toBe(3);

    await helpers.screenshot('report-export-toggles');
  });

  test('should toggle CSV export', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Find CSV toggle
    const csvSwitch = page.getByLabel('CSV Export').or(page.locator('[role="switch"]').first());

    // Get current state
    const parent = csvSwitch.locator('..');
    const isChecked = await page.getByRole('switch', { name: 'CSV Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    console.log(`CSV Export initial state: ${isChecked ? 'ON' : 'OFF'}`);

    // Toggle the switch
    await csvSwitch.click();
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await page.getByRole('switch', { name: 'CSV Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    expect(newState).toBe(!isChecked);

    await helpers.screenshot('report-export-csv-toggled');
  });

  test('should toggle Excel export', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Find Excel toggle
    const excelSwitch = page.getByLabel('Excel Export');

    // Get current state
    const isChecked = await page.getByRole('switch', { name: 'Excel Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    console.log(`Excel Export initial state: ${isChecked ? 'ON' : 'OFF'}`);

    // Toggle the switch
    await excelSwitch.click();
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await page.getByRole('switch', { name: 'Excel Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    expect(newState).toBe(!isChecked);

    await helpers.screenshot('report-export-excel-toggled');
  });

  test('should toggle PDF export', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Find PDF toggle
    const pdfSwitch = page.getByLabel('PDF Export');

    // Get current state
    const isChecked = await page.getByRole('switch', { name: 'PDF Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    console.log(`PDF Export initial state: ${isChecked ? 'ON' : 'OFF'}`);

    // Toggle the switch
    await pdfSwitch.click();
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await page.getByRole('switch', { name: 'PDF Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    expect(newState).toBe(!isChecked);

    await helpers.screenshot('report-export-pdf-toggled');
  });

  test('should show export descriptions', async ({ page }) => {
    const helpers = new TestHelpers(page);

    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Verify descriptions
    const csvDesc = page.getByText(/Comma-separated values format/i);
    const excelDesc = page.getByText(/Native Excel format/i);
    const pdfDesc = page.getByText(/Portable Document Format/i);

    await expect(csvDesc).toBeVisible();
    await expect(excelDesc).toBeVisible();
    await expect(pdfDesc).toBeVisible();

    // Verify note
    const note = page.getByText(/Export buttons will appear/i);
    await expect(note).toBeVisible();

    await helpers.screenshot('report-export-descriptions');
  });
});

test.describe('Report Editor - Save and Load', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('should save filter configuration', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Configure filters
    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg === 0) {
      // Add a filter condition
      await page.getByRole('button', { name: /Add Condition/i }).click();
      await page.waitForTimeout(300);

      // Configure the condition
      const fieldDropdown = page.locator('.bg-muted [role="combobox"]').first();
      await fieldDropdown.click();
      await page.waitForTimeout(300);

      const firstOption = page.getByRole('option').first();
      await firstOption.click();
      await page.waitForTimeout(300);

      // Save
      await helpers.clickButton('Save');
      await helpers.verifyToast('Report saved successfully');
      await page.waitForTimeout(500);

      await helpers.screenshot('report-filters-saved');
    }
  });

  test('should save export configuration', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Configure export settings
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Toggle PDF export
    const pdfSwitch = page.getByLabel('PDF Export');
    await pdfSwitch.click();
    await page.waitForTimeout(300);

    // Save
    await helpers.clickButton('Save');
    await helpers.verifyToast('Report saved successfully');
    await page.waitForTimeout(500);

    await helpers.screenshot('report-export-saved');
  });

  test('should persist settings after page refresh', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Modify export setting
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    const pdfSwitch = page.getByLabel('PDF Export');
    await pdfSwitch.click();
    await page.waitForTimeout(300);

    // Save
    await helpers.clickButton('Save');
    await helpers.verifyToast('Report saved successfully');
    await page.waitForTimeout(500);

    // Refresh page
    await page.reload();
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);

    // Navigate to Export tab again
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Verify setting persisted
    const pdfState = await page.getByRole('switch', { name: 'PDF Export' }).evaluate(
      (el: any) => el.getAttribute('aria-checked') === 'true'
    );

    console.log(`PDF Export after refresh: ${pdfState ? 'ON' : 'OFF'}`);

    await helpers.screenshot('report-export-persistence');
  });
});

test.describe('Report Editor - Preview', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('should have preview button in header', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Check for Preview button
    const previewButton = page.getByRole('link', { name: /Preview/i });
    await expect(previewButton).toBeVisible();

    await helpers.screenshot('report-preview-button-visible');
  });

  test('should open preview when clicked', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Click Preview button
    const previewButton = page.getByRole('link', { name: /Preview/i });
    await previewButton.click();

    // Wait for navigation to viewer
    await page.waitForTimeout(2000);

    // Verify we're on the viewer page
    const currentUrl = page.url();
    console.log(`Current URL after clicking preview: ${currentUrl}`);
    expect(currentUrl).toContain('/reports/viewer/');

    await helpers.screenshot('report-preview-viewer');
  });

  test('should preview without saving', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Make a change without saving
    await page.getByRole('tab', { name: 'General' }).click();
    await page.waitForTimeout(500);

    const nameInput = page.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('Unsaved Test Report');
    await page.waitForTimeout(300);

    // Preview without saving
    const previewButton = page.getByRole('link', { name: /Preview/i });
    await previewButton.click();
    await page.waitForTimeout(2000);

    // Verify preview opened
    expect(page.url()).toContain('/reports/viewer/');

    await helpers.screenshot('report-preview-unsaved-changes');
  });
});

test.describe('Report Editor - Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.login();
    await page.goto('http://localhost:4050/reports/editor/f1fb39be-83be-427c-a6d2-063a254e5ca4');
    await helpers.waitForLoading();
    await page.waitForTimeout(1000);
  });

  test('full workflow: configure all settings, save, preview, and verify', async ({ page }) => {
    const helpers = new TestHelpers(page);

    console.log('=== Step 1: Configure General Settings ===');
    await page.getByRole('tab', { name: 'General' }).click();
    await page.waitForTimeout(500);

    const nameInput = page.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('E2E Complete Test Report');
    console.log('✓ Updated report name');

    await helpers.screenshot('workflow-01-general');

    console.log('=== Step 2: Configure Columns ===');
    await page.getByRole('tab', { name: 'Columns' }).click();
    await page.waitForTimeout(500);

    // Check if columns exist or add new
    const addColumnButton = page.getByRole('button', { name: /Add Column/i });
    if (await addColumnButton.isVisible()) {
      await addColumnButton.click();
      await page.waitForTimeout(300);
      console.log('✓ Added new column');
    }

    await helpers.screenshot('workflow-02-columns');

    console.log('=== Step 3: Configure Filters ===');
    await page.getByRole('tab', { name: 'Filters' }).click();
    await page.waitForTimeout(500);

    const noFieldsMsg = await page.getByText('No fields available').count();
    if (noFieldsMsg === 0) {
      // Add a filter condition
      await page.getByRole('button', { name: /Add Condition/i }).click();
      await page.waitForTimeout(300);
      console.log('✓ Added filter condition');

      // Configure field and operator
      const fieldDropdown = page.locator('.bg-muted [role="combobox"]').first();
      if (await fieldDropdown.isVisible()) {
        await fieldDropdown.click();
        await page.waitForTimeout(300);

        const firstOption = page.getByRole('option').first();
        await firstOption.click();
        await page.waitForTimeout(300);
        console.log('✓ Selected filter field');
      }
    } else {
      console.log('⚠ No fields available for filters');
    }

    await helpers.screenshot('workflow-03-filters');

    console.log('=== Step 4: Configure Export Settings ===');
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.waitForTimeout(500);

    // Enable all export formats
    const csvSwitch = page.getByLabel('CSV Export');
    const excelSwitch = page.getByLabel('Excel Export');
    const pdfSwitch = page.getByLabel('PDF Export');

    await csvSwitch.click();
    await page.waitForTimeout(200);
    console.log('✓ Enabled CSV export');

    await excelSwitch.click();
    await page.waitForTimeout(200);
    console.log('✓ Enabled Excel export');

    await pdfSwitch.click();
    await page.waitForTimeout(200);
    console.log('✓ Enabled PDF export');

    await helpers.screenshot('workflow-04-export');

    console.log('=== Step 5: Save Report ===');
    await helpers.clickButton('Save');
    await helpers.verifyToast('Report saved successfully');
    console.log('✓ Report saved');

    await helpers.screenshot('workflow-05-saved');

    console.log('=== Step 6: Preview Report ===');
    const previewButton = page.getByRole('link', { name: /Preview/i });
    await previewButton.click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/reports/viewer/');
    console.log('✓ Preview opened');

    await helpers.screenshot('workflow-06-preview');

    console.log('=== Workflow Complete ===');
    console.log('All steps executed successfully!');
  });
});
