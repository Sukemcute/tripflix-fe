import { AdminPage } from '@/features/shell/admin-page';
import { DiscoveryJobs } from '@/features/discovery-jobs/discovery-jobs';

export default function RecommendJobsPage() {
  return (
    <AdminPage label="admin.recommendJobs">
      <DiscoveryJobs group="recommend" />
    </AdminPage>
  );
}
