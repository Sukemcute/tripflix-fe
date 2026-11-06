'use client';
import { getApiErrorKind } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';

export function ApiErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  const kind = getApiErrorKind(error);
  return (
    <div role="alert" className="empty-state">
      <p>{vi.api[kind]}</p>
      {kind === 'emailUnverified' && (
        <Link className="secondary-button" href="/account">
          {vi.api.verifyEmailAccount}
        </Link>
      )}
      {retry && (
        <button className="secondary-button" onClick={retry}>
          {vi.api.retry}
        </button>
      )}
    </div>
  );
}
