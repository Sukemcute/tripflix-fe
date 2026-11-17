import { UnavailablePage } from '@/features/shell/unavailable-page';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.analytics} | ${vi.admin.title}` };

export default function Page() {
  return <UnavailablePage kind="analytics" />;
}
