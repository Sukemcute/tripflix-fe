import { AdminPage } from '@/features/shell/admin-page';
import { SearchMonitoring } from '@/features/search-monitoring/search-monitoring';

export default function SearchMonitorPage() {
  return (
    <AdminPage label="admin.searchMonitoring">
      <SearchMonitoring />
    </AdminPage>
  );
}
