import { type Browser, type APIRequestContext, test } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

let cachedAuthCookie: string | null = null;

/**
 * Get authentication cookie for API requests
 * Uses caching to avoid re-authenticating for every test suite
 */
export async function getAuthCookie(request: APIRequestContext, browser?: Browser): Promise<string> {
  // Return cached cookie if available
  if (cachedAuthCookie) {
    console.log('Using cached auth cookie');
    return cachedAuthCookie;
  }

  console.log('Getting fresh auth cookie...');

  // Try API-based authentication first
  try {
    const signInResponse = await request.post('/api/auth/callback/credentials', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin',
        csrfToken: 'test-csrf-token',
        json: true,
      }),
    });

    console.log('Sign-in response status:', signInResponse.status());

    // Get cookies from the response headers
    const setCookieHeaders = signInResponse.headers()['set-cookie'];
    if (setCookieHeaders) {
      const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      for (const cookieHeader of cookieArray) {
        const match = cookieHeader.match(/authjs\.session-token=([^;]+)/);
        if (match) {
          cachedAuthCookie = `authjs.session-token=${match[1]}`;
          console.log('Got auth cookie from API sign-in');
          return cachedAuthCookie;
        }
      }
    }

    console.log('No session cookie in API response, trying browser fallback...');
  } catch (error) {
    console.log('API sign-in failed, trying browser fallback:', error);
  }

  // Fallback: use browser-based login
  if (!browser) {
    throw new Error('Browser is required for fallback authentication');
  }

  const page = await browser.newPage();
  const testHelpers = new TestHelpers(page);

  try {
    await page.goto('/');
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      console.log('Logging in via browser...');
      await testHelpers.login();
    }

    // Wait for session to be established
    await page.waitForTimeout(5000);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const cookies = await page.context().cookies();
    console.log('Cookies after login:', cookies.map(c => c.name));

    const authCookieObj = cookies.find(c => c.name.includes('session-token'));

    if (!authCookieObj) {
      throw new Error('No auth cookie found after login. Available cookies: ' + cookies.map(c => c.name).join(', '));
    }

    cachedAuthCookie = `${authCookieObj.name}=${authCookieObj.value}`;
    console.log('Got auth cookie from browser login');

    return cachedAuthCookie;
  } finally {
    await page.close();
  }
}

/**
 * Clear cached auth cookie (useful for testing logout scenarios)
 */
export function clearAuthCache(): void {
  cachedAuthCookie = null;
}
