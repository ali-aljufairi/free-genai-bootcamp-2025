import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should load pricing page successfully', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page).toHaveURL('/pricing');
    await expect(page.locator('h1')).toContainText(/Choose Your Plan|Pricing/i);
  });

  test('should display pricing page metadata', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page).toHaveTitle(/Pricing.*Sorami/i);
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('plan');
  });

  test('should display free tier card', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=/month')).toBeVisible();
  });

  test('should display pro tier card', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=Coming Soon').first()).toBeVisible();
  });

  test('should show free tier features', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for some expected free tier features
    await expect(page.locator('text=/flashcard/i').first()).toBeVisible();
    await expect(page.locator('text=/vocabulary/i').first()).toBeVisible();
  });

  test('should show pro tier features', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for pro-only features
    await expect(page.locator('text=/unlimited/i').first()).toBeVisible();
  });

  test('should display feature comparison table', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=Feature Comparison')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show Get Started button for unauthenticated users', async ({ page }) => {
    await page.goto('/pricing');
    
    const getStartedButtons = page.locator('button:has-text("Get Started")');
    await expect(getStartedButtons.first()).toBeVisible();
  });

  test('should have call-to-action section', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=/Ready to start learning/i')).toBeVisible();
  });

  test('should display pricing cards with correct structure', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for card elements
    const cards = page.locator('[class*="glass-card"]');
    await expect(cards.first()).toBeVisible();
  });

  test('should show checkmarks for included features', async ({ page }) => {
    await page.goto('/pricing');
    
    // Look for check/X icons indicating feature availability
    const checkIcons = page.locator('svg[class*="lucide"]');
    await expect(checkIcons.first()).toBeVisible();
  });

  test('should have proper responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
  });

  test('should have animation elements', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for framer-motion animated elements (they should render)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('pro tier button should be disabled', async ({ page }) => {
    await page.goto('/pricing');
    
    const proButton = page.locator('button:has-text("Coming Soon")');
    await expect(proButton).toBeDisabled();
  });

  test('should display tier descriptions', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=/Perfect for getting started/i')).toBeVisible();
    await expect(page.locator('text=/Everything you need/i')).toBeVisible();
  });
});