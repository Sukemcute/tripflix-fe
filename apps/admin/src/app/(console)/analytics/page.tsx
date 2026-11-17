import { AnalyticsWorkspace } from '@/features/analytics/analytics-workspace';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.analytics} | ${vi.admin.title}` };

export default function Page() {
  return <AnalyticsWorkspace />;
}
