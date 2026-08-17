'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSession } from './session';

export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/enter');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-[100dvh] bg-canvas px-6 py-10 text-sm text-muted">
        Checking session
      </div>
    );
  }

  return children;
}
