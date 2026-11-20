import { OverviewPage } from '@/features/overview/overview-page';
import { AdminPage } from '@/features/shell/admin-page';

/** Trang đầu của admin: tổng quan theo vai trò (moderator / superadmin). */
export default function AdminHome() {
  return (
    <AdminPage label="admin.overview">
      <OverviewPage />
    </AdminPage>
  );
}
