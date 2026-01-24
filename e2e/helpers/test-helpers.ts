import { Page, Locator } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login to the application with default credentials
   */
  async login(email = 'admin@admin.com', password = 'admin') {
    await this.page.goto('/');

    // Fill in login form
    await this.page.getByPlaceholder('name@example.com').fill(email);
    await this.page.getByLabel('Password').fill(password);

    // Click sign in
    await this.page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for dashboard to load
    await this.page.waitForURL('/', { timeout: 5000 });
    await this.page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Navigate to a specific page by name
   */
  async navigateToPage(pageName: 'Dashboard' | 'SQL Editor' | 'Reports' | 'Charts' | 'Dashboards') {
    await this.page.getByRole('link', { name: pageName, exact: true }).click();
    // Wait a bit for client-side routing
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for and verify toast notification
   */
  async verifyToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = this.page.getByText(message).first();
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    return toast;
  }

  /**
   * Select from a dropdown by trigger and option text
   */
  async selectDropdown(triggerText: string, optionText: string) {
    // Click the dropdown trigger
    const trigger = this.page.getByText(triggerText).first();
    await trigger.click();

    // Wait for dropdown content to appear
    await this.page.waitForTimeout(200);

    // Click the option
    const option = this.page.getByText(optionText).first();
    await option.click();
  }

  /**
   * Fill a form field by label
   */
  async fillByLabel(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Click a button by text
   */
  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for loading to complete (spinner disappears)
   */
  async waitForLoading() {
    const spinners = this.page.locator('.animate-spin');
    if (await spinners.count() > 0) {
      await spinners.first().waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Get table rows count
   */
  async getTableRowCount(tableLocator?: Locator) {
    const table = tableLocator || this.page.locator('table').first();
    const rows = await table.locator('tbody tr').all();
    return rows.length;
  }

  /**
   * Verify table has content
   */
  async verifyTableHasContent(expectedMinRows = 1) {
    const count = await this.getTableRowCount();
    if (count < expectedMinRows) {
      throw new Error(`Expected at least ${expectedMinRows} table rows, but found ${count}`);
    }
  }

  /**
   * Click a menu item in a dropdown menu
   */
  async clickMenuItem(menuTriggerText: string, menuItemText: string) {
    // Click the menu trigger (usually a button with icon)
    const trigger = this.page.getByRole('button').filter({ hasText: menuTriggerText }).first();
    await trigger.click();

    // Wait for menu to appear
    await this.page.waitForTimeout(200);

    // Click the menu item
    const menuItem = this.page.getByRole('menuitem').filter({ hasText: menuItemText }).first();
    await menuItem.click();
  }

  /**
   * Wait for Monaco Editor to be ready
   */
  async waitForMonacoEditor() {
    const editor = this.page.locator('.monaco-editor').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Type in Monaco Editor
   */
  async typeInMonacoEditor(text: string, append = false) {
    await this.waitForMonacoEditor();

    // Click in the editor to focus it
    const editor = this.page.locator('.monaco-editor').first();
    await editor.click();

    if (!append) {
      // Select all and delete existing content
      await this.page.keyboard.press('ControlOrMeta+A');
      await this.page.keyboard.press('Delete');
    }

    // Type the new content
    await this.page.keyboard.type(text);
  }

  /**
   * Get Monaco Editor content
   */
  async getMonacoEditorContent(): Promise<string> {
    await this.waitForMonacoEditor();

    // Select all content
    await this.page.keyboard.press('ControlOrMeta+A');

    // Copy to clipboard
    await this.page.keyboard.press('ControlOrMeta+C');

    // Get from clipboard
    return await this.page.evaluate(() => navigator.clipboard.readText());
  }

  /**
   * Switch to a specific tab by text
   */
  async switchTab(tabText: string) {
    const tab = this.page.getByRole('tab', { name: tabText });
    await tab.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Verify no console errors
   */
  async verifyNoConsoleErrors() {
    const errors: string[] = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors
    await this.page.waitForTimeout(1000);

    return errors;
  }

  /**
   * Handle a dialog (confirm/alert)
   */
  async handleDialog(accept: boolean, promptText?: string) {
    this.page.once('dialog', async dialog => {
      if (promptText) {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Verify element visibility with timeout
   */
  async verifyVisible(selector: string, timeout = 5000) {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Retry a function with delay
   */
  async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await this.page.waitForTimeout(delay);
        }
      }
    }

    throw lastError;
  }
}

/**
 * SQL queries for testing
 */
export const TEST_QUERIES = {
  simple: 'SELECT * FROM users LIMIT 10;',
  join: `
    SELECT
      u.name,
      u.email,
      o.id as order_id,
      o.total_amount,
      o.status
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    LIMIT 20;
  `,
  complexJoin: `
    SELECT
      u.name,
      u.email,
      COUNT(o.id) as order_count,
      SUM(o.total_amount) as total_spent,
      AVG(o.total_amount) as avg_order_value
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(o.id) > 0
    ORDER BY total_spent DESC
    LIMIT 10;
  `,
  aggregation: `
    SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as total,
      AVG(total_amount) as average
    FROM orders
    GROUP BY status
    ORDER BY total DESC;
  `,
  withSubquery: `
    WITH customer_stats AS (
      SELECT
        user_id,
        COUNT(*) as order_count,
        SUM(total_amount) as total_spent
      FROM orders
      GROUP BY user_id
    )
    SELECT
      u.name,
      u.email,
      COALESCE(cs.order_count, 0) as orders,
      COALESCE(cs.total_spent, 0) as spent
    FROM users u
    LEFT JOIN customer_stats cs ON u.id = cs.user_id
    ORDER BY spent DESC
    LIMIT 10;
  `,
};
