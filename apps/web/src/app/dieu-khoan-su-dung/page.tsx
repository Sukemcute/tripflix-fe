import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { TermsPage } from '@/features/legal/terms-page';

export const metadata: Metadata = { title: `${vi.terms.title} | Tripflix` };

export default function Page() {
  return <TermsPage />;
}
