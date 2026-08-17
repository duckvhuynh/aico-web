'use client';

import { SignOut } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '../api/client';

export function AppShell({
  title,
  children,
  showSignOut = false,
}: {
  title: string;
  children: ReactNode;
  showSignOut?: boolean;
}) {
  const router = useRouter();

  async function onSignOut() {
    await signOut();
    router.replace('/enter');
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:bg-pine focus:px-4 focus:py-2 focus:text-surface"
      >
        Skip to main content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5 md:px-10">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
              AI Company OS
            </p>
            <p className="mt-1 text-sm text-ink">{title}</p>
          </div>
          {showSignOut ? (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm text-ink"
            >
              <SignOut size={16} weight="regular" aria-hidden="true" />
              Sign out
            </button>
          ) : null}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl px-6 py-10 md:px-10">
        {children}
      </main>
    </div>
  );
}
