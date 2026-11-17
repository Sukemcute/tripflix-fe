import { StaffManagement } from '@/features/staff/staff-management';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.staff} | ${vi.admin.title}` };

export default function Page() {
  return <StaffManagement />;
}
