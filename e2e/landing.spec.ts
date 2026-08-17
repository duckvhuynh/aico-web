import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing', () => {

  test('invite-only hero has one primary CTA and no registration', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Governed prototypes');
    await expect(page.getByRole('link', { name: 'Enter with an invite', exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /sign up|register|create account/i })).toHaveCount(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('narrow landing does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
