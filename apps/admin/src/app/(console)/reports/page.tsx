import { AdminPage } from '@/features/shell/admin-page';
import { OperationsLog } from '@/features/shell/operations-pages';

export default function ReportsPage() {
  return (
    <AdminPage label="admin.reports">
      <OperationsLog exportable />
    </AdminPage>
  );
}
