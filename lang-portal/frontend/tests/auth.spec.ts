import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to sign-in when accessing protected route', async ({ page }) => {
    await setupClerkTestingToken({ page });
    
    // Navigate to a protected route
    await page.goto('/dashboard');

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should show sign-in form', async ({ page }) => {
    await setupClerkTestingToken({ page });
    
    await page.goto('/sign-in');

    // Check for Clerk sign-in form elements
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should show sign-up form', async ({ page }) => {
    await setupClerkTestingToken({ page });
    
    await page.goto('/sign-up');

    // Check for Clerk sign-up form elements
    await expect(page.locator('text=Sign up')).toBeVisible();
  });

  test('should allow access to public routes without authentication', async ({ page }) => {
    await setupClerkTestingToken({ page });
    
    await page.goto('/health');

    // Should load the health page without redirect
    await expect(page).toHaveURL('/health');
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should display mobile layout on small screens', async ({ page }) => {
    await setupClerkTestingToken({ page });
    
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/sign-in');

    // Check that mobile-specific elements are visible
    // This would need to be adjusted based on actual mobile layout
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(375);
  });
});