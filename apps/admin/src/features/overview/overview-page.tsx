'use client';
import { useApiSession } from '@tripflix/api-client';
import { AdminOverview } from './admin-overview';

/** Cầu nối vai trò → Tổng quan, để `page.tsx` (server) không phải biết phiên đăng nhập. */
export function OverviewPage() {
  const { user } = useApiSession();
  return <AdminOverview isSuperadmin={user?.role === 'superadmin'} />;
}
