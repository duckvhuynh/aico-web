'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getRun } from '../api/client';
import { isApiError } from '../api/errors';
import type { RunRecord } from '../api/types';
import { AppShell } from '../layout/AppShell';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; run: RunRecord }
  | { status: 'error'; message: string };

function isQueuedOrWaiting(run: RunRecord): boolean {
  return (
    run.state === 'DRAFT' ||
    run.state.startsWith('AWAITING_') ||
    run.stage === 'INTAKE' ||
    run.summary.pending_decisions > 0
  );
}

export function RunStatusPage() {
  const params = useParams<{ runId: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : '';
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!UUID.test(runId)) {
      setLoad({ status: 'error', message: 'The run identifier is not valid.' });
      return;
    }
    void (async () => {
      try {
        const result = await getRun(runId);
        if (cancelled) return;
        setLoad({ status: 'ready', run: result.run });
      } catch (caught) {
        if (cancelled) return;
        if (isApiError(caught) && caught.status === 401) {
          setLoad({ status: 'error', message: 'The session expired. Redeem an invite again.' });
          return;
        }
        setLoad({
          status: 'error',
          message: isApiError(caught)
            ? caught.problem.detail
            : 'The run status could not be loaded.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <AppShell title="Run status" showSignOut>
      <h1 className="text-3xl tracking-tight">Submitted goal status</h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
        This screen shows the persisted run and frozen goal. It does not generate
        employee narration.
      </p>

      <div className="mt-8">
        {load.status === 'loading' ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <div className="h-11 bg-surface ring-1 ring-line" />
            <div className="h-24 bg-surface ring-1 ring-line" />
            <span className="sr-only">Loading run status</span>
          </div>
        ) : null}
        {load.status === 'error' ? (
          <p role="alert" className="text-sm text-alert">
            {load.message}
          </p>
        ) : null}
        {load.status === 'ready' ? <RunStatus run={load.run} /> : null}
      </div>
    </AppShell>
  );
}

function RunStatus({ run }: { run: RunRecord }) {
  const goal = run.context.goal.structured_goal;
  return (
    <div className="space-y-8">
      <div role="status" className="border border-pine/30 bg-surface px-4 py-3 text-sm text-ink">
        <p>
          Goal version {run.context.goal.version} is recorded. Run state {run.state}, stage{' '}
          {run.stage}.
        </p>
        {isQueuedOrWaiting(run) ? (
          <p className="mt-2 text-muted">
            Intake is recorded. Queued or waiting work is not shown as active.
          </p>
        ) : null}
        {run.summary.blocking_reason ? (
          <p className="mt-2">Blocking reason: {run.summary.blocking_reason}</p>
        ) : null}
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium">Target user</dt>
          <dd className="mt-1 text-muted">{goal.target_user}</dd>
        </div>
        <div>
          <dt className="font-medium">Problem</dt>
          <dd className="mt-1 text-muted">{goal.problem}</dd>
        </div>
        <div>
          <dt className="font-medium">Desired outcome</dt>
          <dd className="mt-1 text-muted">{goal.desired_outcome}</dd>
        </div>
        <div>
          <dt className="font-medium">Primary flow</dt>
          <dd className="mt-1 text-muted">{goal.primary_flow}</dd>
        </div>
        <div>
          <dt className="font-medium">Must-haves</dt>
          <dd className="mt-1 text-muted">
            <ul className="list-disc pl-5">
              {goal.must_haves.map((item) => (
                <li key={item.id}>
                  {item.id}: {item.text}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-medium">Non-goals</dt>
          <dd className="mt-1 text-muted">
            <ul className="list-disc pl-5">
              {goal.non_goals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-medium">Visual direction</dt>
          <dd className="mt-1 text-muted">{goal.visual_direction}</dd>
        </div>
        <div>
          <dt className="font-medium">Constraints</dt>
          <dd className="mt-1 font-mono text-muted">
            {goal.constraints.max_screens} screens, {goal.constraints.primary_flows} flow,
            client_only {String(goal.constraints.client_only)}, {goal.constraints.data_mode}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Attachments</dt>
          <dd className="mt-1 text-muted">
            {run.context.attachments.length === 0 ? (
              'None linked to this goal version.'
            ) : (
              <ul className="space-y-1">
                {run.context.attachments.map((item) => (
                  <li key={item.id}>
                    {item.filename} · {item.media_type} · {item.size_bytes} bytes
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <p>
        <Link href="/goal" className="inline-flex min-h-11 items-center text-sm text-pine">
          Return to goal intake
        </Link>
      </p>
    </div>
  );
}
