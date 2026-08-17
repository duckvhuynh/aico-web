import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnterPage } from '@/enter/EnterPage';

export const metadata: Metadata = {
  title: 'Enter with an invite',
  robots: { index: false, follow: false },
};

export default function EnterRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-canvas px-6 py-10 text-sm text-muted">
          Loading invite form
        </div>
      }
    >
      <EnterPage />
    </Suspense>
  );
}
