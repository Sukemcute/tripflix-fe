import { AdminPage } from '@/features/shell/admin-page';
import { ModerationWorkspace } from '@/features/moderation/moderation-workspace';

export default function ModerationPage() {
  return (
    <AdminPage label="admin.moderation">
      <ModerationWorkspace />
    </AdminPage>
  );
}
