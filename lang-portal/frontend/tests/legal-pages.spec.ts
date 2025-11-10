import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('Privacy Policy Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should load privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page).toHaveURL('/privacy');
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });

  test('should display privacy policy metadata', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page).toHaveTitle(/Privacy Policy/i);
  });

  test('should have last updated date', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('text=/Last updated/i')).toBeVisible();
  });

  test('should have introduction section', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('text=/Introduction/i')).toBeVisible();
    await expect(page.locator('text=/Sorami/i').first()).toBeVisible();
  });

  test('should have information collection section', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('text=/Information We Collect/i')).toBeVisible();
  });

  test('should have data usage section', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('text=/How We Use/i')).toBeVisible();
  });

  test('should have security section', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('text=/Security/i')).toBeVisible();
  });

  test('should be readable and properly formatted', async ({ page }) => {
    await page.goto('/privacy');
    
    // Check for proper structure with headings
    const headings = page.locator('h2, h3');
    await expect(headings.first()).toBeVisible();
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/privacy');
    
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });

  test('should be accessible via footer link', async ({ page }) => {
    await page.goto('/');
    
    const privacyLink = page.locator('footer a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    
    await privacyLink.click();
    await expect(page).toHaveURL('/privacy');
  });
});

test.describe('Terms of Service Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should load terms of service page', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page).toHaveURL('/terms');
    await expect(page.locator('text=Terms of Service')).toBeVisible();
  });

  test('should have last updated date', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page.locator('text=/Last updated/i')).toBeVisible();
  });

  test('should have acceptance section', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page.locator('text=/Acceptance/i')).toBeVisible();
  });

  test('should have service description section', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page.locator('text=/Service/i')).toBeVisible();
  });

  test('should have user obligations section', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page.locator('text=/User|Obligations|Account/i')).toBeVisible();
  });

  test('should be readable and properly formatted', async ({ page }) => {
    await page.goto('/terms');
    
    const headings = page.locator('h2, h3');
    await expect(headings.first()).toBeVisible();
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/terms');
    
    await expect(page.locator('text=Terms of Service')).toBeVisible();
  });

  test('should be accessible via footer link', async ({ page }) => {
    await page.goto('/');
    
    const termsLink = page.locator('footer a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    
    await termsLink.click();
    await expect(page).toHaveURL('/terms');
  });
});