import { test, expect } from '@playwright/test';

test.describe('SEO Metadata - Robots.txt', () => {
  test('should serve robots.txt with correct rules', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    
    const content = await page.textContent('body');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Disallow: /api/');
    expect(content).toContain('Disallow: /sign-in/');
    expect(content).toContain('Disallow: /sign-up/');
    expect(content).toContain('Disallow: /settings/');
    expect(content).toContain('Sitemap:');
  });

  test('should have valid sitemap URL format', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    const content = await page.textContent('body');
    
    // Check that sitemap URL is present and well-formed
    const sitemapMatch = content?.match(/Sitemap:\s*(https?:\/\/[^\s]+)/);
    expect(sitemapMatch).toBeTruthy();
    expect(sitemapMatch?.[1]).toMatch(/\/sitemap\.xml$/);
  });
});

test.describe('SEO Metadata - Sitemap', () => {
  test('should serve sitemap.xml with valid XML structure', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('xml');
    
    const content = await page.textContent('body');
    expect(content).toContain('<?xml');
    expect(content).toContain('<urlset');
    expect(content).toContain('</urlset>');
  });

  test('should include all required pages in sitemap', async ({ page }) => {
    await page.goto('/sitemap.xml');
    const content = await page.textContent('body');
    
    // Check for main pages
    expect(content).toContain('<loc>');
    
    // Verify key pages are included
    const expectedPages = ['/pricing', '/terms', '/privacy', '/study', '/vocabulary'];
    for (const pagePath of expectedPages) {
      expect(content).toContain(pagePath);
    }
  });

  test('should have valid lastModified dates in sitemap', async ({ page }) => {
    await page.goto('/sitemap.xml');
    const content = await page.textContent('body');
    
    // Check for lastModified tags
    expect(content).toContain('<lastmod>');
    
    // Verify date format (ISO 8601)
    const datePattern = /\d{4}-\d{2}-\d{2}/;
    expect(content).toMatch(datePattern);
  });

  test('should have priority values in sitemap', async ({ page }) => {
    await page.goto('/sitemap.xml');
    const content = await page.textContent('body');
    
    expect(content).toContain('<priority>');
    
    // Home page should have highest priority (1.0)
    expect(content).toMatch(/<priority>1<\/priority>|<priority>1\.0<\/priority>/);
  });

  test('should have changeFrequency values in sitemap', async ({ page }) => {
    await page.goto('/sitemap.xml');
    const content = await page.textContent('body');
    
    expect(content).toContain('<changefreq>');
    
    // Check for valid changeFrequency values
    const validFrequencies = ['weekly', 'monthly', 'yearly'];
    const hasValidFrequency = validFrequencies.some(freq => 
      content?.includes(`<changefreq>${freq}</changefreq>`)
    );
    expect(hasValidFrequency).toBeTruthy();
  });
});

test.describe('Page Metadata - Layout', () => {
  test('should have comprehensive SEO metadata on home page', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/Sorami.*Japanese Language Learning/i);
    
    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Japanese');
    expect(description).toContain('AI');
    
    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDescription).toBeTruthy();
    
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('website');
  });

  test('should have Twitter card metadata', async ({ page }) => {
    await page.goto('/');
    
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
    
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    expect(twitterTitle).toBeTruthy();
  });

  test('should have keywords meta tag', async ({ page }) => {
    await page.goto('/');
    
    const keywords = await page.locator('meta[name="keywords"]').getAttribute('content');
    expect(keywords).toContain('Japanese');
    expect(keywords).toContain('JLPT');
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('/');
    
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
  });

  test('should have proper robots meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page is indexable (no noindex)
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    if (robots) {
      expect(robots).not.toContain('noindex');
      expect(robots).not.toContain('nofollow');
    }
  });
});