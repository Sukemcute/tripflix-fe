'use client';
import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';

export function ApiErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="empty-state">
      <p>{vi.api[getApiErrorKind(error)]}</p>
      {retry && (
        <button className="secondary-button" onClick={retry}>
          {vi.api.retry}
        </button>
      )}
    </div>
  );
}
