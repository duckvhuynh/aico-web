'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redeemInvite } from '../api/client';
import { isApiError } from '../api/errors';
import { AppShell } from '../layout/AppShell';
import { writeSession } from '../session/session';

export function EnterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('invite') ?? '';
  const [token, setToken] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tokenHintId = 'invite-token-hint';
  const tokenErrorId = 'invite-token-error';
  const describedBy = useMemo(
    () => [tokenHintId, error ? tokenErrorId : null].filter(Boolean).join(' '),
    [error],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = token.trim();
    if (trimmed.length < 16 || trimmed.length > 128) {
      setError('Invite tokens are between 16 and 128 characters.');
      return;
    }
    setPending(true);
    try {
      const session = await redeemInvite(trimmed);
      writeSession({
        access_token: session.access_token,
        founder_id: session.founder_id,
        session_id: session.session_id,
        expires_at: Date.now() + session.expires_in * 1000,
      });
      router.replace('/company');
    } catch (caught) {
      if (isApiError(caught)) {
        setError(caught.problem.detail);
      } else {
        setError('The invite could not be redeemed. Retry with a valid token.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell title="Enter with an invite">
      <h1 className="text-3xl tracking-tight">Redeem an invite token</h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">
        This workspace does not offer public registration. Paste the invite token
        issued for your founder account.
      </p>
      <form className="mt-8 space-y-5" onSubmit={(event) => void onSubmit(event)} noValidate>
        {error ? (
          <p id={tokenErrorId} role="alert" className="text-sm text-alert">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="invite-token" className="block text-sm font-medium text-ink">
            Invite token
          </label>
          <p id={tokenHintId} className="mt-1 text-sm text-muted">
            16 to 128 characters. Local development issues tokens from the API.
          </p>
          <input
            id="invite-token"
            name="invite_token"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className="mt-2 min-h-11 w-full border border-line bg-surface px-3 text-ink outline-none focus:ring-2 focus:ring-pine"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-pine px-5 text-surface disabled:opacity-60"
        >
          {pending ? 'Redeeming invite' : 'Continue to company setup'}
        </button>
      </form>
    </AppShell>
  );
}
