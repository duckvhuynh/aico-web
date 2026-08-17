import type { Company, CompanyDraft, CreateCompanyBody, PatchProfileBody } from '../api/types';

export const DRAFT_KEY = 'aico.company-setup.draft.v1';

export const EMPTY_DRAFT: CompanyDraft = {
  name: '',
  purpose: '',
  target_customer: '',
  constraints: [''],
  max_screens: 5,
  sensitive_data_warning_acknowledged: false,
};

export function companyToDraft(company: Company): CompanyDraft {
  const limits = company.current_profile.normalized_limits;
  return {
    name: company.name,
    purpose: company.current_profile.purpose,
    target_customer: company.current_profile.target_customer,
    constraints:
      company.current_profile.constraints.length > 0
        ? company.current_profile.constraints
        : [''],
    max_screens: limits.max_screens,
    sensitive_data_warning_acknowledged:
      company.current_profile.sensitive_data_warning_acknowledged,
  };
}

export function readDraft(): CompanyDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CompanyDraft>;
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      constraints:
        Array.isArray(parsed.constraints) && parsed.constraints.length > 0
          ? parsed.constraints.map((item) => String(item))
          : [''],
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: CompanyDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function cleanedConstraints(constraints: string[]): string[] {
  return constraints.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function toProfileBody(draft: CompanyDraft): PatchProfileBody {
  return {
    purpose: draft.purpose.trim(),
    target_customer: draft.target_customer.trim(),
    constraints: cleanedConstraints(draft.constraints),
    normalized_limits: {
      max_screens: Number(draft.max_screens),
      primary_flows: 1,
      data_mode: 'mock_or_local',
    },
    sensitive_data_warning_acknowledged: draft.sensitive_data_warning_acknowledged,
  };
}

export function toCreateBody(draft: CompanyDraft): CreateCompanyBody {
  return {
    name: draft.name.trim(),
    profile: toProfileBody(draft),
  };
}

export function validateDraft(draft: CompanyDraft, mode: 'create' | 'edit'): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === 'create') {
    const name = draft.name.trim();
    if (name.length < 2 || name.length > 120) {
      errors.name = 'Use a company name between 2 and 120 characters.';
    }
  }
  const purpose = draft.purpose.trim();
  if (purpose.length < 10 || purpose.length > 1000) {
    errors.purpose = 'Purpose must be between 10 and 1,000 characters.';
  }
  const target = draft.target_customer.trim();
  if (target.length < 3 || target.length > 500) {
    errors.target_customer = 'Target customer must be between 3 and 500 characters.';
  }
  const constraints = cleanedConstraints(draft.constraints);
  if (
    constraints.length < 1 ||
    constraints.length > 20 ||
    constraints.some((item) => item.length > 200)
  ) {
    errors.constraints = 'Add between 1 and 20 durable constraints, each up to 200 characters.';
  }
  if (draft.max_screens < 1 || draft.max_screens > 5) {
    errors['normalized_limits.max_screens'] = 'The prototype can include at most five screens.';
  }
  if (!draft.sensitive_data_warning_acknowledged) {
    errors.sensitive_data_warning_acknowledged =
      'Acknowledge that this profile must not include real customer or other sensitive data.';
  }
  return errors;
}
