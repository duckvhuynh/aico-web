import type { Metadata } from 'next';
import { GoalIntakePage } from '@/goal/GoalIntakePage';
import { RequireSession } from '@/session/RequireSession';

export const metadata: Metadata = {
  title: 'Goal intake',
  robots: { index: false, follow: false },
};

export default function GoalRoute() {
  return (
    <RequireSession>
      <GoalIntakePage />
    </RequireSession>
  );
}
