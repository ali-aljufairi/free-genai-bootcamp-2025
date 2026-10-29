import { expect, test } from '@playwright/test';

test('public learner onboarding navigates from the landing page to pricing and sign-up', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Sorami/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/sign-up');
  await page.getByRole('link', { name: 'View Pricing' }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole('heading', { name: /Choose Your Plan|Manage Your Plan/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(mobileLayout.content).toBeLessThanOrEqual(mobileLayout.viewport + 1);

  await page.goto('/sign-up');
  await expect(page).toHaveURL(/\/sign-up/);
  expect(pageErrors).toEqual([]);
});
