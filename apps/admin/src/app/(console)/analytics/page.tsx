import { AdminPage } from '@/features/shell/admin-page';
import { AnalyticsWorkspace } from '@/features/analytics/analytics-workspace';

export default function AnalyticsPage() {
  return (
    <AdminPage label="admin.analytics">
      <AnalyticsWorkspace />
    </AdminPage>
  );
}
