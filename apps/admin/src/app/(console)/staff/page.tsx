import { AdminPage } from '@/features/shell/admin-page';
import { StaffManagement } from '@/features/staff/staff-management';

export default function StaffPage() {
  return (
    <AdminPage label="admin.staff">
      <StaffManagement />
    </AdminPage>
  );
}
