'use client';
import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { Icon } from '../ui/icon';

export function AdminApiError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="my-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
    >
      <Icon name="alert" size={16} />
      <p className="min-w-0 flex-1">{vi.api[getApiErrorKind(error)]}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="rounded-lg border border-danger/30 bg-background px-3 py-1 text-xs font-semibold hover:bg-danger/10"
        >
          {vi.api.retry}
        </button>
      )}
    </div>
  );
}
