import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const COMPANY = {
  id: 'co_test',
  name: 'North Desk Studio',
  status: 'ACTIVE',
  row_version: 1,
  created_at: '2026-08-16T00:00:00.000Z',
  current_profile: {
    id: 'pv_test',
    version: 1,
    purpose: 'Ship a bounded prototype for invited founders.',
    target_customer: 'Solo technical founders',
    constraints: ['Mock or local data only'],
    normalized_limits: {
      max_screens: 5,
      primary_flows: 1,
      data_mode: 'mock_or_local',
    },
    sensitive_data_warning_acknowledged: true,
    created_at: '2026-08-16T00:00:00.000Z',
  },
};

const GOAL = {
  target_user: 'Independent consultants',
  problem: 'Turning discovery notes into a proposal is slow and inconsistent.',
  desired_outcome: 'Prepare and review a clear proposal draft.',
  primary_flow: 'Create proposal, review sections, mark ready',
  must_haves: [{ id: 'MH-001', text: 'Create a proposal from structured mock client data' }],
  non_goals: ['Payment processing'],
  visual_direction: 'Calm editorial workspace with clear status hierarchy',
  constraints: {
    max_screens: 5,
    primary_flows: 1,
    client_only: true,
    data_mode: 'mock_or_local',
  },
  reference_ids: [],
};

async function mockSession(page: Page) {
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
}

async function mockGoalControlPlane(page: Page, options?: { goalStatus?: number }) {
  await mockSession(page);
  let initiative:
    | {
        id: string;
        type: 'PROTOTYPE';
        title: string;
        status: string;
        current_goal_version: null;
        row_version: number;
        created_at: string;
      }
    | null = null;

  await page.route('**/api/v1/companies/current', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        headers: { ETag: '"1"', 'content-type': 'application/json' },
        body: JSON.stringify({ data: COMPANY }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/v1/initiatives/current', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    if (!initiative) {
      await route.fulfill({
        status: 404,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 404,
          code: 'resource_not_found',
          title: 'Resource not found',
          detail: 'The requested resource does not exist.',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ETag: `"${initiative.row_version}"`, 'content-type': 'application/json' },
      body: JSON.stringify({ data: initiative }),
    });
  });

  await page.route('**/api/v1/initiatives', async (route) => {
    if (route.request().method() !== 'POST' || route.request().url().includes('/goals')) {
      await route.fallback();
      return;
    }
    const payload = JSON.parse(route.request().postData() ?? '{}') as { title: string };
    initiative = {
      id: '019c0000-0000-7000-8000-000000000010',
      type: 'PROTOTYPE',
      title: payload.title,
      status: 'DRAFT',
      current_goal_version: null,
      row_version: 1,
      created_at: '2026-08-17T00:00:00.000Z',
    };
    await route.fulfill({
      status: 201,
      headers: {
        ETag: '"1"',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: initiative, meta: { replayed: false } }),
    });
  });

  await page.route('**/api/v1/attachments', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const payload = JSON.parse(route.request().postData() ?? '{}') as { filename: string };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: '019c0000-0000-7000-8000-000000000011',
          media_type: 'text/plain',
          size_bytes: 16,
          checksum_sha256: 'a'.repeat(64),
          scan_state: 'CLEAN',
          filename: payload.filename,
          expires_at: null,
        },
        meta: { replayed: false },
      }),
    });
  });

  await page.route('**/api/v1/initiatives/*/goals', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    if (options?.goalStatus === 422) {
      await route.fulfill({
        status: 422,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 422,
          code: 'goal_out_of_scope',
          title: 'The goal exceeds the Prototype Initiative boundary',
          detail: 'Submit a new goal version that fits the bounded client-side prototype scope.',
          errors: [{ field: 'goal.constraints.client_only', rule: 'client_only' }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      headers: {
        Location: '/api/v1/runs/019c0000-0000-7000-8000-000000000012',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          goal_version: {
            id: '019c0000-0000-7000-8000-000000000013',
            version: 1,
            schema_version: 1,
            created_by: 'FOUNDER',
            created_at: '2026-08-17T00:00:00.000Z',
          },
          run: {
            id: '019c0000-0000-7000-8000-000000000012',
            state: 'DRAFT',
            stage: 'INTAKE',
            version: 1,
            context_snapshot_id: '019c0000-0000-7000-8000-000000000014',
            workflow_version: 'mvp-v1',
            policy_version: 'mvp-v1',
          },
        },
        meta: { replayed: false },
      }),
    });
  });

  await page.route('**/api/v1/runs/019c0000-0000-7000-8000-000000000012', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ETag: '"1"', 'content-type': 'application/json' },
      body: JSON.stringify({
        data: {
          id: '019c0000-0000-7000-8000-000000000012',
          initiative_id: '019c0000-0000-7000-8000-000000000010',
          state: 'DRAFT',
          stage: 'INTAKE',
          version: 1,
          workflow_version: 'mvp-v1',
          policy_version: 'mvp-v1',
          context: {
            company_profile_version_id: 'pv_test',
            goal_version_id: '019c0000-0000-7000-8000-000000000013',
            answer_version_ids: [],
            company_profile: COMPANY.current_profile,
            goal: {
              id: '019c0000-0000-7000-8000-000000000013',
              version: 1,
              schema_version: 1,
              structured_goal: GOAL,
              created_by: 'FOUNDER',
              created_at: '2026-08-17T00:00:00.000Z',
            },
            attachments: [
              {
                id: '019c0000-0000-7000-8000-000000000011',
                media_type: 'text/plain',
                size_bytes: 16,
                checksum_sha256: 'a'.repeat(64),
                filename: 'notes.txt',
              },
            ],
          },
          summary: {
            task_counts: { READY: 1 },
            pending_decisions: 0,
            blocking_reason: null,
          },
          created_at: '2026-08-17T00:00:00.000Z',
          updated_at: '2026-08-17T00:00:00.000Z',
        },
      }),
    });
  });
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'aico.session.v1',
      JSON.stringify({
        access_token: 'test-token',
        founder_id: 'fnd_test',
        session_id: 'ses_test',
        expires_at: Date.now() + 3_600_000,
      }),
    );
  });
}

async function openGoal(page: Page) {
  await seedSession(page);
  await page.goto('/goal');
  await expect(page.getByRole('heading', { name: 'Prototype goal' })).toBeVisible();
}

async function fillRequiredGoal(page: Page) {
  await page.getByLabel('Target user').fill('Independent consultants');
  await page.getByLabel('Problem').fill('Turning discovery notes into a proposal is slow and inconsistent.');
  await page.getByLabel('Desired outcome').fill('Prepare and review a clear proposal draft.');
  await page.getByRole('textbox', { name: 'Primary flow', exact: true }).fill(
    'Create proposal, review sections, mark ready',
  );
  await page.getByRole('textbox', { name: 'Must-have 1' }).fill(
    'Create a proposal from structured mock client data',
  );
  await page.getByRole('textbox', { name: 'Non-goal 1' }).fill('Payment processing');
  await page.getByLabel('Visual direction').fill('Calm editorial workspace with clear status hierarchy');
  await page.getByLabel('I acknowledge the sensitive-data warning').check();
}

test.describe('goal intake', () => {
  test('keyboard path submits a goal and shows persisted run status', async ({ page }) => {
    const keys: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/goals')) {
        keys.push(request.headers()['idempotency-key'] ?? '');
      }
    });
    await mockGoalControlPlane(page);
    await openGoal(page);
    await fillRequiredGoal(page);
    await page.setInputFiles('input[name="attachments"]', {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('reference notes'),
    });
    await page.getByRole('button', { name: 'Submit goal' }).click();
    await expect(page.getByRole('heading', { name: 'Submitted goal status' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Goal version 1 is recorded');
    await expect(page.getByRole('status')).toContainText('Run state DRAFT');
    await expect(page.getByRole('status')).toContainText('Queued or waiting work is not shown as active');
    await expect(page.getByText('notes.txt')).toBeVisible();
    await expect(page.getByText(/generating your prototype/i)).toHaveCount(0);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('company setup offers goal intake after a provisioned profile', async ({ page }) => {
    await mockGoalControlPlane(page);
    await seedSession(page);
    await page.goto('/company');
    await expect(page.getByRole('link', { name: 'Continue to goal intake' })).toBeVisible();
    await page.getByRole('link', { name: 'Continue to goal intake' }).click();
    await expect(page.getByRole('heading', { name: 'Prototype goal' })).toBeVisible();
  });

  test('recovers draft input after reload', async ({ page }) => {
    await mockGoalControlPlane(page);
    await openGoal(page);
    await page.getByLabel('Target user').fill('Recoverable consultants');
    await page.reload();
    await expect(page.getByLabel('Target user')).toHaveValue('Recoverable consultants');
  });

  test('keeps values after an out-of-scope server warning', async ({ page }) => {
    await mockGoalControlPlane(page, { goalStatus: 422 });
    await openGoal(page);
    await fillRequiredGoal(page);
    await page.getByRole('button', { name: 'Submit goal' }).click();
    await expect(page.getByText(/not truncated/i)).toBeVisible();
    await expect(page.getByLabel('Target user')).toHaveValue('Independent consultants');
    await expect(page.getByRole('heading', { name: 'Prototype goal' })).toBeVisible();
  });

  for (const viewport of [
    { name: 'narrow', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
  ] as const) {
    test(`keyboard, screen reader names, and ${viewport.name} layout`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockGoalControlPlane(page);
      await openGoal(page);
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
