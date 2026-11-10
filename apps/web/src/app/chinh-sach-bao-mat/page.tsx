import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { PrivacyPage } from '@/features/legal/privacy-page';

export const metadata: Metadata = { title: `${vi.privacy.title} | Tripflix` };

export default function Page() {
  return <PrivacyPage />;
}
