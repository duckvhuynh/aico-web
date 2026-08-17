import type { Metadata } from 'next';
import { RunStatusPage } from '@/run/RunStatusPage';
import { RequireSession } from '@/session/RequireSession';

export const metadata: Metadata = {
  title: 'Run status',
  robots: { index: false, follow: false },
};

export default function RunRoute() {
  return (
    <RequireSession>
      <RunStatusPage />
    </RequireSession>
  );
}
