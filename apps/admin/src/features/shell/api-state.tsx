'use client';
import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminButton } from '../../ui/button';

export function AdminApiError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-adm bg-coral-tint px-3 py-2 text-[13px] text-coral-ink"
    >
      <p>{vi.api[getApiErrorKind(error)]}</p>
      {retry && (
        <AdminButton size="sm" onClick={retry}>
          {vi.api.retry}
        </AdminButton>
      )}
    </div>
  );
}
