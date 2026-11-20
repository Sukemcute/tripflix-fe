import type { ReactNode } from 'react';
import { AdminShell } from '@/features/shell/live-workspace';

/** Khung Admin (menu, đăng nhập, realtime) dùng chung cho mọi trang quản trị; không bị dựng lại khi chuyển trang. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
