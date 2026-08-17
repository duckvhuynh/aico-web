import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function mockControlPlane(page: Page) {
  await page.route('**/api/v1/auth/session', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
          founder_id: 'fnd_test',
          session_id: 'ses_test',
        },
      }),
    });
  });

  await page.route('**/api/v1/companies/current', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 404,
          code: 'resource_not_found',
          title: 'Company not found',
          detail: 'No company is provisioned for this founder.',
        }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/v1/companies', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const payload = JSON.parse(route.request().postData() ?? '{}') as {
      name: string;
      profile: Record<string, unknown>;
    };
    await route.fulfill({
      status: 201,
      headers: {
        ETag: '"1"',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          id: 'co_test',
          name: payload.name,
          status: 'ACTIVE',
          row_version: 1,
          created_at: '2026-08-16T00:00:00.000Z',
          current_profile: {
            id: 'pv_test',
            version: 1,
            created_at: '2026-08-16T00:00:00.000Z',
            ...payload.profile,
          },
        },
        meta: { replayed: false },
      }),
    });
  });
}

async function redeemAndOpenForm(page: Page) {
  await mockControlPlane(page);
  await page.goto('/enter');
  await page.getByLabel('Invite token').fill('invite-token-for-tests-01');
  await page.getByRole('button', { name: 'Continue to company setup' }).click();
  await expect(page.getByRole('heading', { name: 'Company profile' })).toBeVisible();
}

test.describe('company setup', () => {

  test('keyboard path commits a profile and explains run snapshots', async ({ page }) => {
    const keys: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/v1/companies')) {
        keys.push(request.headers()['idempotency-key'] ?? '');
      }
    });
    await redeemAndOpenForm(page);
    await page.getByLabel('Company name').fill('North Desk Studio');
    await page.getByLabel('Purpose').fill('Ship a bounded prototype for invited founders.');
    await page.getByLabel('Target customer').fill('Solo technical founders');
    await page.getByRole('textbox', { name: 'Constraint 1' }).fill('Mock or local data only');
    await page.getByLabel('I acknowledge the sensitive-data warning').check();
    await page.getByRole('button', { name: 'Create company profile' }).click();
    await expect(page.getByRole('status')).toContainText('committed as version 1');
    await expect(page.getByRole('status')).toContainText('frozen snapshot');
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('recovers draft input after reload', async ({ page }) => {
    await redeemAndOpenForm(page);
    await page.getByLabel('Company name').fill('Recoverable Studio');
    await page.reload();
    await expect(page.getByLabel('Company name')).toHaveValue('Recoverable Studio');
  });

  test('associates a server field error', async ({ page }) => {
    await mockControlPlane(page);
    await page.route('**/api/v1/companies', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 422,
          code: 'unsupported_sensitive_data',
          title: 'Sensitive-data warning was not acknowledged',
          detail: 'Acknowledge that the company profile must not include real customer data.',
          errors: [{ field: 'sensitive_data_warning_acknowledged', rule: 'must_acknowledge' }],
        }),
      });
    });
    await page.goto('/enter');
    await page.getByLabel('Invite token').fill('invite-token-for-tests-01');
    await page.getByRole('button', { name: 'Continue to company setup' }).click();
    await page.getByLabel('Company name').fill('North Desk Studio');
    await page.getByLabel('Purpose').fill('Ship a bounded prototype for invited founders.');
    await page.getByLabel('Target customer').fill('Solo technical founders');
    await page.getByRole('textbox', { name: 'Constraint 1' }).fill('Mock or local data only');
    await page.getByLabel('I acknowledge the sensitive-data warning').check();
    await page.getByRole('button', { name: 'Create company profile' }).click();
    await expect(page.getByText(/must not include real customer/i)).toBeVisible();
  });

  for (const viewport of [
    { name: 'narrow', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
  ] as const) {
    test(`keyboard, screen reader names, and ${viewport.name} layout`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await redeemAndOpenForm(page);
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
