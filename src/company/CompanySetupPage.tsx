'use client';

import { useEffect, useState } from 'react';
import { getCurrentCompany } from '../api/client';
import { isApiError } from '../api/errors';
import type { Company, CompanyDraft } from '../api/types';
import { AppShell } from '../layout/AppShell';
import { CompanySetupForm } from './CompanySetupForm';
import { EMPTY_DRAFT, clearDraft, companyToDraft, readDraft } from './draft';

type LoadState =
  | { status: 'loading' }
  | { status: 'create'; draft: CompanyDraft }
  | { status: 'edit'; draft: CompanyDraft; company: Company; etag: string | null }
  | { status: 'error'; message: string };

export function CompanySetupPage() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [committed, setCommitted] = useState<{
    company: Company;
    replayed: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getCurrentCompany();
        if (cancelled) return;
        const stored = readDraft();
        setLoad({
          status: 'edit',
          company: result.company,
          etag: result.etag,
          draft: stored ?? companyToDraft(result.company),
        });
      } catch (caught) {
        if (cancelled) return;
        if (isApiError(caught) && caught.status === 404) {
          setLoad({ status: 'create', draft: readDraft() ?? EMPTY_DRAFT });
          return;
        }
        if (isApiError(caught) && caught.status === 401) {
          setLoad({ status: 'error', message: 'The session expired. Redeem an invite again.' });
          return;
        }
        setLoad({
          status: 'error',
          message: isApiError(caught)
            ? caught.problem.detail
            : 'The company profile could not be loaded.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onCommitted(company: Company, etag: string | null, replayed: boolean) {
    clearDraft();
    setCommitted({ company, replayed });
    setLoad({
      status: 'edit',
      company,
      etag,
      draft: companyToDraft(company),
    });
  }

  return (
    <AppShell title="Company setup" showSignOut>
      <h1 className="text-3xl tracking-tight">Company profile</h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
        Record the company the control plane will use for the bounded prototype.
        Drafts stay in this browser until a version is committed.
      </p>

      {committed ? (
        <div
          role="status"
          className="mt-6 border border-pine/30 bg-surface px-4 py-3 text-sm text-ink"
        >
          <p>
            Company profile committed as version {committed.company.current_profile.version}
            {committed.replayed ? ' (same request replayed)' : ''}.
          </p>
          <p className="mt-2 text-muted">
            This version is now current for future runs. An already-started run
            keeps the frozen snapshot it captured. Start a new run if you want
            later edits to apply.
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        {load.status === 'loading' ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <div className="h-11 bg-surface ring-1 ring-line" />
            <div className="h-32 bg-surface ring-1 ring-line" />
            <div className="h-24 bg-surface ring-1 ring-line" />
            <span className="sr-only">Loading company profile</span>
          </div>
        ) : null}
        {load.status === 'error' ? (
          <p role="alert" className="text-sm text-alert">
            {load.message}
          </p>
        ) : null}
        {load.status === 'create' ? (
          <CompanySetupForm
            mode="create"
            initial={load.draft}
            etag={null}
            onCommitted={onCommitted}
          />
        ) : null}
        {load.status === 'edit' ? (
          <CompanySetupForm
            key={`${load.company.current_profile.version}-${load.etag ?? 'none'}`}
            mode="edit"
            initial={load.draft}
            etag={load.etag}
            onCommitted={onCommitted}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
