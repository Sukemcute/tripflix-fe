import { SearchMonitoring } from '@/features/search-monitoring/search-monitoring';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.searchMonitoring.title} | ${vi.admin.title}` };

export default function Page() {
  return <SearchMonitoring />;
}
