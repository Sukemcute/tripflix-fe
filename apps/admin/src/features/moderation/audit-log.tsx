'use client';
import { vi } from '@tripflix/i18n';
import { PageHeader } from '../ui/primitives';
import { ModerationLog } from './moderation-log';

/** Nhật ký kiểm toán: chính là nhật ký thao tác kiểm duyệt, lọc theo ngày, người và thao tác. */
export function AuditLogPage() {
  const text = vi.adminConsole.audit;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={text.title} subtitle={text.subtitle} />
      <ModerationLog />
    </div>
  );
}
