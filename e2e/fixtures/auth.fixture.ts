import { test as base, Page } from '@playwright/test';

/**
 * SIMPLIFIED Authentication Fixture
 * Uses direct login instead of session storage for reliability
 */

type AuthFixtures = {
  authenticatedPage: Page;
};

const test = base.extend<AuthFixtures>({
  // Standard authenticated page - direct login approach
  authenticatedPage: async ({ page }, use) => {
    // Navigate to home page
    await page.goto('/');

    // Check if already authenticated by trying to access protected content
    const currentUrl = page.url();
    const isAuthenticated = await page.evaluate(() => {
      // Check for auth indicators
      return localStorage.getItem('auth_token') !== null ||
             document.cookie.includes('auth') ||
             sessionStorage.getItem('auth') !== null ||
             !window.location.pathname.includes('/login');
    });

    if (!isAuthenticated || currentUrl.includes('/login')) {
      // Perform login
      await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
      await page.getByLabel('Password').fill('admin');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for ONE of multiple indicators of successful login (more robust)
      await Promise.race([
        // Option 1: Dashboard heading (case-insensitive)
        page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 15000 }),
        // Option 2: Navigation menu
        page.getByRole('navigation').waitFor({ state: 'visible', timeout: 15000 }),
        // Option 3: Quick Actions text
        page.getByText('Quick Actions').waitFor({ state: 'visible', timeout: 15000 }),
        // Option 4: URL change to home
        page.waitForURL('/', { timeout: 15000 }),
      ]);

      // Small wait for any pending redirects
      await page.waitForTimeout(500);
    }

    // Use the authenticated page
    await use(page);
  },
});

// Export the base expect for convenience
export { expect } from '@playwright/test';
export { test };
