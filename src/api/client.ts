import { ApiError } from './errors';
import { clearIdempotencyKey, getOrCreateIdempotencyKey } from './idempotency';
import type {
  AttachmentRecord,
  Company,
  CreateAttachmentBody,
  CreateCompanyBody,
  CreateGoalBody,
  CreateInitiativeBody,
  Envelope,
  GoalAndRun,
  Initiative,
  PatchProfileBody,
  ProblemDetails,
  RunRecord,
  SessionPayload,
} from './types';
import { clearSession, readSession } from '../session/session';

const API_BASE = '/api/v1';

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

function toProblem(status: number, body: unknown): ProblemDetails {
  if (body && typeof body === 'object' && 'code' in body && 'detail' in body) {
    return body as ProblemDetails;
  }
  return {
    status,
    code: 'http_error',
    title: 'The request could not be completed',
    detail: 'The control plane returned an unexpected response.',
    errors: [],
  };
}

async function request<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string; ifMatch?: string } = {},
): Promise<{ body: T; etag: string | null; status: number }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const session = readSession();
  if (session) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (init.idempotencyKey) {
    headers.set('Idempotency-Key', init.idempotencyKey);
  }
  if (init.ifMatch) {
    headers.set('If-Match', init.ifMatch);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const body = await parseBody(response);
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new ApiError({ ...toProblem(response.status, body), status: response.status });
  }
  return {
    body: body as T,
    etag: response.headers.get('ETag'),
    status: response.status,
  };
}

export async function redeemInvite(inviteToken: string): Promise<SessionPayload> {
  const result = await request<Envelope<SessionPayload>>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ invite_token: inviteToken.trim() }),
  });
  return result.body.data;
}

export async function signOut(): Promise<void> {
  try {
    await request('/auth/sign-out', { method: 'POST' });
  } finally {
    clearSession();
    clearIdempotencyKey();
  }
}

export async function getCurrentCompany(): Promise<{ company: Company; etag: string | null }> {
  const result = await request<Envelope<Company>>('/companies/current', { method: 'GET' });
  return { company: result.body.data, etag: result.etag };
}

export async function createCompany(
  payload: CreateCompanyBody,
): Promise<{ company: Company; etag: string | null; replayed: boolean }> {
  const key = getOrCreateIdempotencyKey('companies.create', payload);
  const result = await request<Envelope<Company>>('/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: key,
  });
  if (!result.body.meta?.replayed) {
    clearIdempotencyKey();
  }
  return {
    company: result.body.data,
    etag: result.etag,
    replayed: Boolean(result.body.meta?.replayed),
  };
}

export async function replaceProfile(
  payload: PatchProfileBody,
  etag: string,
): Promise<{ company: Company; etag: string | null; replayed: boolean }> {
  const key = getOrCreateIdempotencyKey('companies.profile.replace', { etag, payload });
  const result = await request<Envelope<Company>>('/companies/current/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    idempotencyKey: key,
    ifMatch: etag,
  });
  if (!result.body.meta?.replayed) {
    clearIdempotencyKey();
  }
  return {
    company: result.body.data,
    etag: result.etag,
    replayed: Boolean(result.body.meta?.replayed),
  };
}

export async function getCurrentInitiative(): Promise<{
  initiative: Initiative;
  etag: string | null;
}> {
  const result = await request<Envelope<Initiative>>('/initiatives/current', { method: 'GET' });
  return { initiative: result.body.data, etag: result.etag };
}

export async function createInitiative(
  payload: CreateInitiativeBody,
): Promise<{ initiative: Initiative; etag: string | null; replayed: boolean }> {
  const key = getOrCreateIdempotencyKey('initiatives.create', payload);
  const result = await request<Envelope<Initiative>>('/initiatives', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: key,
  });
  if (!result.body.meta?.replayed) {
    clearIdempotencyKey();
  }
  return {
    initiative: result.body.data,
    etag: result.etag,
    replayed: Boolean(result.body.meta?.replayed),
  };
}

export async function ensureCurrentInitiative(
  title: string,
): Promise<{ initiative: Initiative; etag: string | null }> {
  try {
    return await getCurrentInitiative();
  } catch (caught) {
    if (!(caught instanceof ApiError) || caught.status !== 404) {
      throw caught;
    }
  }
  try {
    return await createInitiative({ type: 'PROTOTYPE', title });
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 409) {
      return getCurrentInitiative();
    }
    throw caught;
  }
}

export async function createAttachment(
  payload: CreateAttachmentBody,
): Promise<{ attachment: AttachmentRecord; replayed: boolean }> {
  const key = getOrCreateIdempotencyKey('attachments.create', payload);
  const result = await request<Envelope<AttachmentRecord>>('/attachments', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: key,
  });
  if (!result.body.meta?.replayed) {
    clearIdempotencyKey();
  }
  return {
    attachment: result.body.data,
    replayed: Boolean(result.body.meta?.replayed),
  };
}

export async function createGoal(
  initiativeId: string,
  payload: CreateGoalBody,
  etag: string,
): Promise<{ result: GoalAndRun; etag: string | null; replayed: boolean }> {
  const key = getOrCreateIdempotencyKey('initiatives.goals.create', {
    initiativeId,
    etag,
    payload,
  });
  const result = await request<Envelope<GoalAndRun>>(`/initiatives/${initiativeId}/goals`, {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: key,
    ifMatch: etag,
  });
  if (!result.body.meta?.replayed) {
    clearIdempotencyKey();
  }
  return {
    result: result.body.data,
    etag: result.etag,
    replayed: Boolean(result.body.meta?.replayed),
  };
}

export async function getRun(runId: string): Promise<{ run: RunRecord; etag: string | null }> {
  const result = await request<Envelope<RunRecord>>(`/runs/${runId}`, { method: 'GET' });
  return { run: result.body.data, etag: result.etag };
}
