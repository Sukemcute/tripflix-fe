'use client';
import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';

export function AdminApiError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="admin-error">
      <p>{vi.api[getApiErrorKind(error)]}</p>
      {retry && (
        <button className="admin-secondary" onClick={retry}>
          {vi.api.retry}
        </button>
      )}
    </div>
  );
}
