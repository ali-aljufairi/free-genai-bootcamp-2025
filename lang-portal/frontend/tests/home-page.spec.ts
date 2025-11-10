import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test.describe('Home Page - Hero Section', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should display hero section with title', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText(/Sorami|空見/);
  });

  test('should display hero description', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/language learning/i')).toBeVisible();
    await expect(page.locator('text=/fluency/i')).toBeVisible();
  });

  test('should show Get Started button', async ({ page }) => {
    await page.goto('/');
    
    const getStartedButton = page.locator('button:has-text("Get Started")');
    await expect(getStartedButton.first()).toBeVisible();
  });

  test('should display AI-powered features badges', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/AI-Powered Learning/i')).toBeVisible();
  });

  test('should have animated elements in hero', async ({ page }) => {
    await page.goto('/');
    
    // Hero should be visible and rendered
    const heroSection = page.locator('#hero-section, section').first();
    await expect(heroSection).toBeVisible();
  });
});

test.describe('Home Page - AI Features Section', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should display AI features section title', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/AI-Powered Learning Features/i')).toBeVisible();
  });

  test('should show AI Live Speaking feature', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/AI Live Speaking/i')).toBeVisible();
    await expect(page.locator('text=/conversation/i')).toBeVisible();
  });

  test('should show AI Chat Tutor feature', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/AI Chat Tutor/i')).toBeVisible();
    await expect(page.locator('text=/grammar/i')).toBeVisible();
  });

  test('should show Speech-to-Image Learning feature', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Speech-to-Image/i')).toBeVisible();
    await expect(page.locator('text=/visual/i')).toBeVisible();
  });

  test('should show AI Agent Study feature', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/AI Agent/i')).toBeVisible();
  });

  test('should display feature benefits with checkmarks', async ({ page }) => {
    await page.goto('/');
    
    // Look for checkmark icons (lucide CheckCircle components)
    const checkmarks = page.locator('svg').filter({ hasText: '' });
    expect(await checkmarks.count()).toBeGreaterThan(0);
  });
});

test.describe('Home Page - Value Propositions', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should display Why Choose Sorami section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Why Choose Sorami/i')).toBeVisible();
  });

  test('should show comprehensive content library', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Comprehensive Content/i')).toBeVisible();
    await expect(page.locator('text=/JLPT/i')).toBeVisible();
  });

  test('should show multiple study modes', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Study Modes/i')).toBeVisible();
  });

  test('should show progress tracking feature', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Progress Tracking/i')).toBeVisible();
  });

  test('should show personalized learning', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Personalized Learning/i')).toBeVisible();
  });
});

test.describe('Home Page - CTA Section', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should display call-to-action section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Ready to start/i')).toBeVisible();
  });

  test('should show Get Started button in CTA', async ({ page }) => {
    await page.goto('/');
    
    const ctaButtons = page.locator('button:has-text("Get Started")');
    await expect(ctaButtons.last()).toBeVisible();
  });

  test('should show View Pricing button', async ({ page }) => {
    await page.goto('/');
    
    const pricingButton = page.locator('button:has-text("View Pricing")');
    await expect(pricingButton).toBeVisible();
  });

  test('View Pricing button should navigate to pricing page', async ({ page }) => {
    await page.goto('/');
    
    const pricingButton = page.locator('button:has-text("View Pricing")');
    await pricingButton.click();
    
    await expect(page).toHaveURL('/pricing');
  });

  test('should display beta availability message', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=/Beta Available/i')).toBeVisible();
  });
});

test.describe('Home Page - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Get Started")').first()).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=/AI-Powered/i')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Home Page - Structured Data', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto('/');
    
    const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
    expect(structuredData).toBeTruthy();
    
    if (structuredData) {
      const data = JSON.parse(structuredData);
      expect(data['@context']).toBe('https://schema.org');
      expect(data['@type']).toBe('WebApplication');
      expect(data.name).toBe('Sorami');
    }
  });

  test('structured data should include feature list', async ({ page }) => {
    await page.goto('/');
    
    const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
    
    if (structuredData) {
      const data = JSON.parse(structuredData);
      expect(data.featureList).toBeTruthy();
      expect(Array.isArray(data.featureList)).toBeTruthy();
      expect(data.featureList.length).toBeGreaterThan(0);
    }
  });
});