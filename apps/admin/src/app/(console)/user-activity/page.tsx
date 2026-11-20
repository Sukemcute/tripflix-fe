import { AdminPage } from '@/features/shell/admin-page';
import { UserActivityWorkspace } from '@/features/user-activity/user-activity-workspace';

export default function UserActivityPage() {
  return (
    <AdminPage label="admin.userActivity">
      <UserActivityWorkspace />
    </AdminPage>
  );
}
