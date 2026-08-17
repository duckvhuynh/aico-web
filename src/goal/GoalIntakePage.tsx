'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentCompany } from '../api/client';
import { isApiError } from '../api/errors';
import type { GoalDraft } from '../api/types';
import { AppShell } from '../layout/AppShell';
import { GoalIntakeForm } from './GoalIntakeForm';
import { EMPTY_DRAFT, clearDraft, readDraft } from './draft';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; draft: GoalDraft }
  | { status: 'need-company' }
  | { status: 'error'; message: string };

export function GoalIntakePage() {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await getCurrentCompany();
        if (cancelled) return;
        setLoad({ status: 'ready', draft: readDraft() ?? EMPTY_DRAFT });
      } catch (caught) {
        if (cancelled) return;
        if (isApiError(caught) && caught.status === 404) {
          setLoad({ status: 'need-company' });
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

  function onSubmitted(runId: string) {
    clearDraft();
    router.replace(`/runs/${runId}`);
  }

  return (
    <AppShell title="Goal intake" showSignOut>
      <h1 className="text-3xl tracking-tight">Prototype goal</h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
        Describe the bounded prototype the control plane should qualify. Drafts stay in
        this browser until a goal version is submitted.
      </p>

      <div className="mt-8">
        {load.status === 'loading' ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <div className="h-11 bg-surface ring-1 ring-line" />
            <div className="h-32 bg-surface ring-1 ring-line" />
            <div className="h-24 bg-surface ring-1 ring-line" />
            <span className="sr-only">Loading goal intake</span>
          </div>
        ) : null}
        {load.status === 'error' ? (
          <p role="alert" className="text-sm text-alert">
            {load.message}
          </p>
        ) : null}
        {load.status === 'need-company' ? (
          <p role="status" className="text-sm text-ink">
            Record a company profile before submitting a goal.{' '}
            <Link href="/company" className="text-pine">
              Continue to company setup
            </Link>
          </p>
        ) : null}
        {load.status === 'ready' ? (
          <GoalIntakeForm
            initial={load.draft}
            onSubmitted={onSubmitted}
            onNeedCompany={() => setLoad({ status: 'need-company' })}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
