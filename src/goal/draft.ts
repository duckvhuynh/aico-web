import type { CreateGoalBody, GoalAttachmentRef, GoalDraft } from '../api/types';
import { ATTACHMENT_MAX_COUNT } from './attachments';

export const DRAFT_KEY = 'aico.goal-intake.draft.v1';

export const EMPTY_DRAFT: GoalDraft = {
  target_user: '',
  problem: '',
  desired_outcome: '',
  primary_flow: '',
  must_haves: [''],
  non_goals: [''],
  visual_direction: '',
  max_screens: 5,
  mock_data_acknowledged: false,
  attachments: [],
};

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map((item) => String(item));
}

function asAttachments(value: unknown): GoalAttachmentRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.filename !== 'string') return null;
      return {
        id: record.id,
        filename: record.filename,
        media_type: typeof record.media_type === 'string' ? record.media_type : 'text/plain',
        size_bytes: Number(record.size_bytes) || 0,
      };
    })
    .filter((item): item is GoalAttachmentRef => item !== null)
    .slice(0, ATTACHMENT_MAX_COUNT);
}

export function readDraft(): GoalDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoalDraft>;
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      must_haves: asStringArray(parsed.must_haves, ['']),
      non_goals: asStringArray(parsed.non_goals, ['']),
      attachments: asAttachments(parsed.attachments),
      max_screens: Number(parsed.max_screens) || 5,
      mock_data_acknowledged: Boolean(parsed.mock_data_acknowledged),
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: GoalDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function cleanedLines(values: string[]): string[] {
  return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function initiativeTitle(draft: GoalDraft): string {
  const outcome = draft.desired_outcome.trim().slice(0, 160);
  return outcome.length >= 3 ? outcome : 'Prototype initiative';
}

export function toCreateGoalBody(draft: GoalDraft): CreateGoalBody {
  const mustHaves = cleanedLines(draft.must_haves);
  return {
    schema_version: 1,
    goal: {
      target_user: draft.target_user.trim(),
      problem: draft.problem.trim(),
      desired_outcome: draft.desired_outcome.trim(),
      primary_flow: draft.primary_flow.trim(),
      must_haves: mustHaves.map((text, index) => ({
        id: `MH-${String(index + 1).padStart(3, '0')}`,
        text,
      })),
      non_goals: cleanedLines(draft.non_goals),
      visual_direction: draft.visual_direction.trim(),
      constraints: {
        max_screens: Number(draft.max_screens),
        primary_flows: 1,
        client_only: true,
        data_mode: 'mock_or_local',
      },
      reference_ids: [],
    },
    attachment_ids: draft.attachments.map((item) => item.id),
    start_run: true,
  };
}

export function validateDraft(draft: GoalDraft, pendingCount: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const target = draft.target_user.trim();
  if (target.length < 3 || target.length > 300) {
    errors['goal.target_user'] = 'Target user must be between 3 and 300 characters.';
  }
  const problem = draft.problem.trim();
  if (problem.length < 10 || problem.length > 1000) {
    errors['goal.problem'] = 'Problem must be between 10 and 1,000 characters.';
  }
  const outcome = draft.desired_outcome.trim();
  if (outcome.length < 10 || outcome.length > 1000) {
    errors['goal.desired_outcome'] = 'Desired outcome must be between 10 and 1,000 characters.';
  }
  const flow = draft.primary_flow.trim();
  if (flow.length < 5 || flow.length > 500) {
    errors['goal.primary_flow'] = 'Primary flow must be between 5 and 500 characters.';
  }
  const mustHaves = cleanedLines(draft.must_haves);
  if (
    mustHaves.length < 1 ||
    mustHaves.length > 20 ||
    mustHaves.some((item) => item.length < 3 || item.length > 500)
  ) {
    errors['goal.must_haves'] =
      'Add between 1 and 20 must-haves, each between 3 and 500 characters.';
  }
  const nonGoals = cleanedLines(draft.non_goals);
  if (
    nonGoals.length < 1 ||
    nonGoals.length > 20 ||
    nonGoals.some((item) => item.length > 500)
  ) {
    errors['goal.non_goals'] = 'Add between 1 and 20 non-goals, each up to 500 characters.';
  }
  const visual = draft.visual_direction.trim();
  if (visual.length < 3 || visual.length > 500) {
    errors['goal.visual_direction'] = 'Visual direction must be between 3 and 500 characters.';
  }
  if (draft.max_screens < 1 || draft.max_screens > 5) {
    errors['goal.constraints.max_screens'] = 'The prototype can include at most five screens.';
  }
  if (!draft.mock_data_acknowledged) {
    errors.mock_data_acknowledged =
      'Acknowledge that this goal and its attachments use mock or local data only.';
  }
  if (draft.attachments.length + pendingCount > ATTACHMENT_MAX_COUNT) {
    errors.attachment_ids = 'Attach at most five references.';
  }
  return errors;
}
