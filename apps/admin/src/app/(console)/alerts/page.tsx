import { AdminPage } from '@/features/shell/admin-page';
import { OperationsAlerts } from '@/features/shell/operations-pages';

export default function AlertsPage() {
  return (
    <AdminPage label="admin.alerts">
      <OperationsAlerts />
    </AdminPage>
  );
}
