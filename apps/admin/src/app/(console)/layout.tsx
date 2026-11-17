import type { ReactNode } from 'react';
import { AdminConsole } from '@/features/shell/admin-console';

/** Shell ở layout nên socket realtime và menu giữ nguyên khi chuyển trang (TF104). */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminConsole>{children}</AdminConsole>;
}
