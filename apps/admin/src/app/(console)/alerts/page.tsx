import { OpsAlertsPage } from '@/features/live/ops-alerts-page';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.alerts} | ${vi.admin.title}` };

export default function Page() {
  return <OpsAlertsPage />;
}
