import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('Footer Component', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should display footer on home page', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should display Sorami branding', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('footer >> text=Sorami')).toBeVisible();
    await expect(page.locator('footer >> text=空見')).toBeVisible();
  });

  test('should display pricing link', async ({ page }) => {
    await page.goto('/');
    
    const pricingLink = page.locator('footer a[href="/pricing"]');
    await expect(pricingLink).toBeVisible();
    await expect(pricingLink).toHaveText('Pricing');
  });

  test('should display terms of service link', async ({ page }) => {
    await page.goto('/');
    
    const termsLink = page.locator('footer a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText('Terms of Service');
  });

  test('should display privacy policy link', async ({ page }) => {
    await page.goto('/');
    
    const privacyLink = page.locator('footer a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText('Privacy Policy');
  });

  test('should display copyright notice', async ({ page }) => {
    await page.goto('/');
    
    const currentYear = new Date().getFullYear();
    await expect(page.locator('footer >> text=/© ' + currentYear + '/i')).toBeVisible();
    await expect(page.locator('footer >> text=/All rights reserved/i')).toBeVisible();
  });

  test('pricing link should navigate correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('footer a[href="/pricing"]').click();
    await expect(page).toHaveURL('/pricing');
  });

  test('terms link should navigate correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('footer a[href="/terms"]').click();
    await expect(page).toHaveURL('/terms');
  });

  test('privacy link should navigate correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('footer a[href="/privacy"]').click();
    await expect(page).toHaveURL('/privacy');
  });

  test('should display footer on pricing page', async ({ page }) => {
    await page.goto('/pricing');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should display footer on terms page', async ({ page }) => {
    await page.goto('/terms');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should display footer on privacy page', async ({ page }) => {
    await page.goto('/privacy');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have hover effects on links', async ({ page }) => {
    await page.goto('/');
    
    const pricingLink = page.locator('footer a[href="/pricing"]');
    
    // Get initial color
    await pricingLink.hover();
    
    // Link should remain visible after hover
    await expect(pricingLink).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(page.locator('footer >> text=Sorami')).toBeVisible();
  });

  test('should have proper styling and backdrop blur', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    const classes = await footer.getAttribute('class');
    
    expect(classes).toContain('border-t');
    expect(classes).toContain('backdrop-blur');
  });

  test('links should be separated by bullets', async ({ page }) => {
    await page.goto('/');
    
    // Check for bullet separators
    await expect(page.locator('footer >> text=•')).toBeVisible();
  });
});