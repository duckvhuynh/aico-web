import { afterEach, describe, expect, it } from 'vitest';
import { associateFieldErrors, formAlert } from '../api/errors';
import { clearIdempotencyKey, getOrCreateIdempotencyKey } from '../api/idempotency';
import { EMPTY_DRAFT, companyToDraft, toCreateBody, validateDraft } from './draft';
import type { Company } from '../api/types';

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('associateFieldErrors', () => {
  it('maps server field rules onto labeled messages', () => {
    const mapped = associateFieldErrors({
      status: 422,
      code: 'unsupported_sensitive_data',
      title: 'Sensitive-data warning was not acknowledged',
      detail: 'Acknowledge the warning.',
      errors: [{ field: 'sensitive_data_warning_acknowledged', rule: 'must_acknowledge' }],
    });
    expect(mapped.sensitive_data_warning_acknowledged).toMatch(/must not include real customer/i);
  });
});

describe('formAlert', () => {
  it('keeps a form-level title when fields are associated', () => {
    expect(
      formAlert(
        {
          status: 422,
          code: 'domain_rule_violated',
          title: 'The company profile is outside the MVP boundary',
          detail: 'Submit name, purpose, target customer.',
        },
        { purpose: 'too short' },
      ),
    ).toBe('The company profile is outside the MVP boundary');
  });
});

describe('idempotency keys', () => {
  it('reuses the key for the same operation and payload', () => {
    const payload = { name: 'North Desk' };
    const first = getOrCreateIdempotencyKey('companies.create', payload);
    const second = getOrCreateIdempotencyKey('companies.create', payload);
    expect(second).toBe(first);
  });

  it('issues a new key when the payload changes', () => {
    const first = getOrCreateIdempotencyKey('companies.create', { name: 'A' });
    const second = getOrCreateIdempotencyKey('companies.create', { name: 'B' });
    expect(second).not.toBe(first);
  });

  it('can be cleared after a committed submit', () => {
    const first = getOrCreateIdempotencyKey('companies.create', { name: 'A' });
    clearIdempotencyKey();
    const second = getOrCreateIdempotencyKey('companies.create', { name: 'A' });
    expect(second).not.toBe(first);
  });
});

describe('draft mapping', () => {
  it('builds a create payload with normalized limits', () => {
    const body = toCreateBody({
      ...EMPTY_DRAFT,
      name: '  North Desk Studio  ',
      purpose: 'Ship a bounded prototype for invited founders.',
      target_customer: 'Solo technical founders',
      constraints: ['  Mock data only  ', '', 'No live PII'],
      max_screens: 4,
      sensitive_data_warning_acknowledged: true,
    });
    expect(body.name).toBe('North Desk Studio');
    expect(body.profile.constraints).toEqual(['Mock data only', 'No live PII']);
    expect(body.profile.normalized_limits).toEqual({
      max_screens: 4,
      primary_flows: 1,
      data_mode: 'mock_or_local',
    });
  });

  it('rejects missing acknowledgement and empty constraints', () => {
    const errors = validateDraft(EMPTY_DRAFT, 'create');
    expect(errors.name).toBeTruthy();
    expect(errors.purpose).toBeTruthy();
    expect(errors.constraints).toBeTruthy();
    expect(errors.sensitive_data_warning_acknowledged).toBeTruthy();
  });

  it('copies a committed company into the editable draft', () => {
    const company: Company = {
      id: 'co_1',
      name: 'North Desk Studio',
      status: 'ACTIVE',
      row_version: 1,
      created_at: '2026-08-16T00:00:00.000Z',
      current_profile: {
        id: 'pv_1',
        version: 2,
        purpose: 'Ship a bounded prototype for invited founders.',
        target_customer: 'Solo technical founders',
        constraints: ['Mock data only'],
        normalized_limits: {
          max_screens: 3,
          primary_flows: 1,
          data_mode: 'mock_or_local',
        },
        sensitive_data_warning_acknowledged: true,
        created_at: '2026-08-16T00:00:00.000Z',
      },
    };
    expect(companyToDraft(company).max_screens).toBe(3);
    expect(companyToDraft(company).name).toBe('North Desk Studio');
  });
});
