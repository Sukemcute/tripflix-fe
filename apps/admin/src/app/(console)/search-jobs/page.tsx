import { DiscoveryJobs } from '@/features/discovery-jobs/discovery-jobs';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.discoveryJobs.search.title} | ${vi.admin.title}` };

export default function Page() {
  return <DiscoveryJobs group="search" />;
}
