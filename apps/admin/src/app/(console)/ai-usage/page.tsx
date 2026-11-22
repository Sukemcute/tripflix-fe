import { AdminPage } from '@/features/shell/admin-page';
import { AiUsageReport } from '@/features/ai-usage/ai-usage-report';

export default function AiUsagePage() {
  return (
    <AdminPage label="admin.aiUsage">
      <AiUsageReport />
    </AdminPage>
  );
}
