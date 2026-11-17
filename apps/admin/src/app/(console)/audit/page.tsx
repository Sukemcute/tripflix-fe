import { AuditLogPage } from '@/features/moderation/audit-log';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.audit} | ${vi.admin.title}` };

export default function Page() {
  return <AuditLogPage />;
}
