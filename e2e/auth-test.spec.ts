import { test, expect } from '@playwright/test';

/**
 * Authentication Test - Verify login works
 */

test('Authentication should complete successfully', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Fill in credentials
  await page.getByPlaceholder('name@example.com').fill('admin@admin.com');
  await page.getByLabel('Password').fill('admin');

  // Click sign in
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation to dashboard
  // Login redirects to /dashboard or /
  await Promise.race([
    page.getByRole('heading', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 20000 }),
    page.waitForURL(/\/dashboard|\/$/, { timeout: 20000 }),
  ]);

  // Verify we're logged in by checking for dashboard elements
  await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10000 });

  // Verify SQL Editor link is visible
  await expect(page.getByRole('link', { name: /SQL Editor/i })).toBeVisible();
});
