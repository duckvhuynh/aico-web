export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  trace_id?: string;
  errors?: Array<Record<string, unknown>>;
  remediation?: string[];
}

export interface NormalizedLimits {
  max_screens: number;
  primary_flows: 1;
  data_mode: 'mock_or_local';
}

export interface CompanyProfile {
  id: string;
  version: number;
  purpose: string;
  target_customer: string;
  constraints: string[];
  normalized_limits: NormalizedLimits;
  sensitive_data_warning_acknowledged: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  status: string;
  row_version: number;
  current_profile: CompanyProfile;
  created_at: string;
}

export interface Envelope<T> {
  data: T;
  meta?: {
    correlation_id?: string;
    replayed?: boolean;
  };
}

export interface SessionPayload {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  founder_id: string;
  session_id: string;
}

export interface CompanyDraft {
  name: string;
  purpose: string;
  target_customer: string;
  constraints: string[];
  max_screens: number;
  sensitive_data_warning_acknowledged: boolean;
}

export interface CreateCompanyBody {
  name: string;
  profile: {
    purpose: string;
    target_customer: string;
    constraints: string[];
    normalized_limits: NormalizedLimits;
    sensitive_data_warning_acknowledged: boolean;
  };
}

export type PatchProfileBody = CreateCompanyBody['profile'];

export interface Initiative {
  id: string;
  type: 'PROTOTYPE';
  title: string;
  status: string;
  current_goal_version: string | null;
  row_version: number;
  created_at: string;
}

export interface CreateInitiativeBody {
  type: 'PROTOTYPE';
  title: string;
}

export interface MustHave {
  id: string;
  text: string;
}

export interface GoalConstraints {
  max_screens: number;
  primary_flows: 1;
  client_only: true;
  data_mode: 'mock_or_local';
}

export interface StructuredGoal {
  target_user: string;
  problem: string;
  desired_outcome: string;
  primary_flow: string;
  must_haves: MustHave[];
  non_goals: string[];
  visual_direction: string;
  constraints: GoalConstraints;
  reference_ids: string[];
}

export interface CreateGoalBody {
  schema_version: 1;
  goal: StructuredGoal;
  attachment_ids: string[];
  start_run: true;
}

export interface AttachmentRecord {
  id: string;
  media_type: string;
  size_bytes: number;
  checksum_sha256: string;
  scan_state: string;
  filename: string;
  expires_at: string | null;
}

export interface CreateAttachmentBody {
  declared_media_type: string;
  filename: string;
  content_sha256: string;
  content_base64: string;
}

export interface GoalAttachmentRef {
  id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
}

export interface GoalDraft {
  target_user: string;
  problem: string;
  desired_outcome: string;
  primary_flow: string;
  must_haves: string[];
  non_goals: string[];
  visual_direction: string;
  max_screens: number;
  mock_data_acknowledged: boolean;
  attachments: GoalAttachmentRef[];
}

export interface GoalVersionSummary {
  id: string;
  version: number;
  schema_version: number;
  created_by: string;
  created_at: string;
}

export interface CreatedRun {
  id: string;
  state: string;
  stage: string;
  version: number;
  context_snapshot_id: string;
  workflow_version: string;
  policy_version: string;
}

export interface GoalAndRun {
  goal_version: GoalVersionSummary;
  run: CreatedRun;
}

export interface FrozenAttachment {
  id: string;
  media_type: string;
  size_bytes: number;
  checksum_sha256: string;
  filename: string;
}

export interface RunRecord {
  id: string;
  initiative_id: string;
  state: string;
  stage: string;
  version: number;
  workflow_version: string;
  policy_version: string;
  context: {
    company_profile_version_id: string;
    goal_version_id: string;
    answer_version_ids: string[];
    company_profile: {
      id: string;
      version: number;
      purpose: string;
      target_customer: string;
      constraints: string[];
      normalized_limits: NormalizedLimits;
      created_at: string;
    };
    goal: {
      id: string;
      version: number;
      schema_version: number;
      structured_goal: StructuredGoal;
      created_by: string;
      created_at: string;
    };
    attachments: FrozenAttachment[];
  };
  summary: {
    task_counts: Record<string, number>;
    pending_decisions: number;
    blocking_reason: string | null;
  };
  created_at: string;
  updated_at: string;
}
