import { afterEach, describe, expect, it } from 'vitest';
import { associateFieldErrors, formAlert } from '../api/errors';
import { validateLocalFile } from './attachments';
import { EMPTY_DRAFT, initiativeTitle, toCreateGoalBody, validateDraft } from './draft';

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('goal draft mapping', () => {
  it('assigns MH identifiers and prototype constraints', () => {
    const body = toCreateGoalBody({
      ...EMPTY_DRAFT,
      target_user: 'Independent consultants',
      problem: 'Turning discovery notes into a proposal is slow and inconsistent.',
      desired_outcome: 'Prepare and review a clear proposal draft.',
      primary_flow: 'Create proposal, review sections, mark ready',
      must_haves: ['  Create a proposal from structured mock client data  ', '', 'Review sections'],
      non_goals: ['Payment processing', ''],
      visual_direction: 'Calm editorial workspace',
      max_screens: 4,
      mock_data_acknowledged: true,
      attachments: [
        {
          id: '019c0000-0000-7000-8000-000000000099',
          filename: 'notes.txt',
          media_type: 'text/plain',
          size_bytes: 12,
        },
      ],
    });
    expect(body.goal.must_haves).toEqual([
      { id: 'MH-001', text: 'Create a proposal from structured mock client data' },
      { id: 'MH-002', text: 'Review sections' },
    ]);
    expect(body.goal.non_goals).toEqual(['Payment processing']);
    expect(body.goal.constraints).toEqual({
      max_screens: 4,
      primary_flows: 1,
      client_only: true,
      data_mode: 'mock_or_local',
    });
    expect(body.attachment_ids).toEqual(['019c0000-0000-7000-8000-000000000099']);
    expect(body.start_run).toBe(true);
  });

  it('rejects missing acknowledgement and empty must-haves', () => {
    const errors = validateDraft(EMPTY_DRAFT, 0);
    expect(errors['goal.target_user']).toBeTruthy();
    expect(errors['goal.must_haves']).toBeTruthy();
    expect(errors.mock_data_acknowledged).toBeTruthy();
  });

  it('derives an initiative title from the desired outcome', () => {
    expect(
      initiativeTitle({
        ...EMPTY_DRAFT,
        desired_outcome: 'Prepare and review a clear proposal draft.',
      }),
    ).toBe('Prepare and review a clear proposal draft.');
  });
});

describe('attachment client policy', () => {
  it('rejects executable filenames before upload', () => {
    const file = new File(['hello'], 'payload.exe', { type: 'application/octet-stream' });
    expect(validateLocalFile(file, 0, 0)).toMatch(/not an allowed reference type/i);
  });

  it('accepts a small text reference', () => {
    const file = new File(['reference notes'], 'notes.txt', { type: 'text/plain' });
    expect(validateLocalFile(file, 0, 0)).toBeNull();
  });
});

describe('goal server error mapping', () => {
  it('keeps out-of-scope drafts editable and field-associated', () => {
    const problem = {
      status: 422,
      code: 'goal_out_of_scope',
      title: 'The goal exceeds the Prototype Initiative boundary',
      detail: 'Submit a new goal version that fits the bounded client-side prototype scope.',
      errors: [{ field: 'goal.constraints.client_only', rule: 'client_only' }],
    };
    const mapped = associateFieldErrors(problem);
    expect(mapped['goal.constraints.client_only']).toMatch(/client-only/i);
    expect(formAlert(problem, mapped)).toMatch(/not truncated/i);
  });
});
