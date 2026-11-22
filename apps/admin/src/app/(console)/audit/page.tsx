import { AdminPage } from '@/features/shell/admin-page';
import { OperationsLog } from '@/features/shell/operations-pages';

export default function AuditPage() {
  return (
    <AdminPage label="admin.audit">
      <OperationsLog />
    </AdminPage>
  );
}
