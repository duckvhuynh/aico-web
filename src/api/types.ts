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
