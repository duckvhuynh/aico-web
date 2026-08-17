import type { ProblemDetails } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiError';
    this.status = problem.status;
    this.problem = problem;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Company name',
  purpose: 'Purpose',
  target_customer: 'Target customer',
  constraints: 'Durable constraints',
  'normalized_limits.max_screens': 'Maximum screens',
  'normalized_limits.primary_flows': 'Primary flows',
  'normalized_limits.data_mode': 'Data mode',
  sensitive_data_warning_acknowledged: 'Sensitive-data warning',
  'goal.target_user': 'Target user',
  'goal.problem': 'Problem',
  'goal.desired_outcome': 'Desired outcome',
  'goal.primary_flow': 'Primary flow',
  'goal.must_haves': 'Must-haves',
  'goal.non_goals': 'Non-goals',
  'goal.visual_direction': 'Visual direction',
  'goal.constraints.max_screens': 'Maximum screens',
  'goal.constraints.primary_flows': 'Primary flows',
  'goal.constraints.client_only': 'Client-only prototype',
  'goal.constraints.data_mode': 'Data mode',
  attachment_ids: 'Attachments',
  start_run: 'Start run',
};

export function associateFieldErrors(problem: ProblemDetails): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const error of problem.errors ?? []) {
    const field = typeof error.field === 'string' ? error.field : '';
    if (!field) continue;
    const rule = typeof error.rule === 'string' ? error.rule : '';
    mapped[field] = fieldMessage(field, rule, problem.detail);
  }
  return mapped;
}

function fieldMessage(field: string, rule: string, fallback: string): string {
  if (rule === 'must_acknowledge') {
    return 'Acknowledge that this profile must not include real customer or other sensitive data.';
  }
  if (rule === 'max_five_screens') {
    return 'The prototype can include at most five screens.';
  }
  if (rule === 'one_primary_flow') {
    return 'The prototype supports exactly one primary flow.';
  }
  if (rule === 'mock_or_local_data') {
    return 'Data mode must stay mock or local for this prototype.';
  }
  if (rule === 'company_name_length') {
    return 'Use a company name between 2 and 120 characters.';
  }
  if (rule === 'purpose_length') {
    return 'Purpose must be between 10 and 1,000 characters.';
  }
  if (rule === 'target_customer_length') {
    return 'Target customer must be between 3 and 500 characters.';
  }
  if (rule === 'durable_constraints_required') {
    return 'Add between 1 and 20 durable constraints, each up to 200 characters.';
  }
  if (rule === 'client_only') {
    return 'The prototype must stay client-only. Server-backed product work is out of scope.';
  }
  if (rule === 'unique_must_have_ids') {
    return 'Each must-have needs a unique MH-NNN identifier.';
  }
  if (rule === 'first_slice_requires_start_run') {
    return 'The first goal version must start a run.';
  }
  if (rule === 'validated_ready_unexpired') {
    return 'Replace attachments that are unvalidated, rejected, or expired.';
  }
  const label = FIELD_LABELS[field] ?? field;
  return `${label}: ${fallback}`;
}

export function formAlert(problem: ProblemDetails, fieldErrors: Record<string, string>): string {
  if (problem.code === 'goal_out_of_scope') {
    return `${problem.title}. ${problem.detail} Edit the draft to narrow scope; it was not truncated.`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return problem.title ?? 'Correct the highlighted fields and retry.';
  }
  return problem.detail;
}
