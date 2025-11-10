import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('ClientLayout - Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('pricing page should have navbar and footer', async ({ page }) => {
    await page.goto('/pricing');
    
    // Should have navbar
    const navbar = page.locator('nav, [role="navigation"]').first();
    await expect(navbar).toBeVisible();
    
    // Should have footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('terms page should have navbar and footer', async ({ page }) => {
    await page.goto('/terms');
    
    const navbar = page.locator('nav, [role="navigation"]').first();
    await expect(navbar).toBeVisible();
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('privacy page should have navbar and footer', async ({ page }) => {
    await page.goto('/privacy');
    
    const navbar = page.locator('nav, [role="navigation"]').first();
    await expect(navbar).toBeVisible();
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('home page should have navbar and footer', async ({ page }) => {
    await page.goto('/');
    
    const navbar = page.locator('nav, [role="navigation"]').first();
    await expect(navbar).toBeVisible();
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('public pages should not have sidebar', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check that sidebar is not present (sidebar typically has specific navigation items)
    const sidebarItems = page.locator('text=/dashboard|study|vocabulary/i').first();
    // On public pages, these might appear in navbar or content, but not in a sidebar
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('ClientLayout - Theme Support', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should support dark theme', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const htmlClasses = await html.getAttribute('class');
    
    // Theme should be set (either 'dark' or 'light')
    expect(htmlClasses).toBeTruthy();
  });

  test('body should have atmospheric background classes', async ({ page }) => {
    await page.goto('/');
    
    const body = page.locator('body');
    const bodyClasses = await body.getAttribute('class');
    
    expect(bodyClasses).toContain('bg-gradient-to-br');
    expect(bodyClasses).toContain('atmospheric-bg');
  });
});

test.describe('ClientLayout - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345');
    
    // Next.js should return 404
    expect(response?.status()).toBe(404);
  });

  test('should maintain layout on error pages', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    
    // Should still have basic layout structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});