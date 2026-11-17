import { AiUsageReport } from '@/features/ai-usage/ai-usage-report';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.aiUsage.title} | ${vi.admin.title}` };

export default function Page() {
  return <AiUsageReport />;
}
