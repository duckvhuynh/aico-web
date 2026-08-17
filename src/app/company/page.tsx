import type { Metadata } from 'next';
import { CompanySetupPage } from '@/company/CompanySetupPage';
import { RequireSession } from '@/session/RequireSession';

export const metadata: Metadata = {
  title: 'Company setup',
  robots: { index: false, follow: false },
};

export default function CompanyRoute() {
  return (
    <RequireSession>
      <CompanySetupPage />
    </RequireSession>
  );
}
