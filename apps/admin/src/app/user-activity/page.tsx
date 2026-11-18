import { PlaceholderPage } from '@/features/shell/placeholder-page';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.userActivity.title} | Tripflix Admin` };

export default function UserActivityPage() {
  return <PlaceholderPage label="admin.userActivity" />;
}
