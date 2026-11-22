import { AdminPage } from '@/features/shell/admin-page';
import { DiscoveryJobs } from '@/features/discovery-jobs/discovery-jobs';

export default function SearchJobsPage() {
  return (
    <AdminPage label="admin.searchJobs">
      <DiscoveryJobs group="search" />
    </AdminPage>
  );
}
