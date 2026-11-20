'use client';
import { useApiSession } from '@tripflix/api-client';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import type { ReactNode } from 'react';
import { PageHeader } from '@/ui/page-header';
import { canAccessNavItem, findNavItem } from './nav';

/**
 * Khung của một trang: kiểm quyền theo menu, vẽ tiêu đề trang, rồi mới dựng nội dung.
 * Không đủ quyền thì nội dung không được dựng (không gọi API).
 */
export function AdminPage({
  label,
  actions,
  children,
}: {
  label: MessageKey;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useApiSession();
  const item = findNavItem(label);
  const isAllowed = !!item && canAccessNavItem(user?.role, item);
  return (
    <>
      <PageHeader
        title={label === 'admin.overview' ? vi.adminOperations.overviewTitle : t(label)}
        description={isAllowed ? item?.description : undefined}
        actions={actions}
      />
      <div className="ops-content mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        {isAllowed ? children : <p role="alert">{vi.api.superadminOnly}</p>}
      </div>
    </>
  );
}
