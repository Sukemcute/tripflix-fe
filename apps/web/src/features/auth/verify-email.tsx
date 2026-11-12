'use client';

import { getApiErrorKind, useApiSession } from '@tripflix/api-client';
import { emailVerificationControllerVerify } from '@tripflix/api-client/core-api/auth/auth';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';

export function VerifyEmail({ token }: { token?: string }) {
  const { session, isReady, user } = useApiSession();
  const refresh = useMutation({ mutationFn: () => session.refreshUser() });
  const verify = useMutation({
    mutationFn: (code: string) =>
      emailVerificationControllerVerify({ token: code }, { skipAuthRefresh: true, skipAuthorization: true }),
    onSuccess: () => {
      if (user) refresh.mutate();
    },
  });
  const isInvalid = !token || getApiErrorKind(verify.error) === 'invalid';

  return (
    <>
      <h2>{vi.api.verifyEmailTitle}</h2>
      {verify.isSuccess ? (
        <>
          <output className="auth-success">{vi.api.verifyEmailSuccess}</output>
          <ApiErrorNotice error={refresh.error} retry={() => refresh.mutate()} />
        </>
      ) : isInvalid ? (
        <p role="alert" className="auth-error">
          {vi.api.verifyEmailLinkInvalid}
        </p>
      ) : (
        <>
          <p className="auth-hint">{vi.api.verifyEmailBody}</p>
          <ApiErrorNotice error={verify.error} />
          <button
            type="button"
            className="primary-button auth-submit"
            disabled={!isReady || verify.isPending}
            onClick={() => verify.mutate(token)}
          >
            {verify.isPending ? vi.api.loggingIn : vi.api.verifyEmailSubmit}
          </button>
        </>
      )}
      <Link prefetch={false} className="auth-link auth-switch" href="/account">
        {vi.api.verifyEmailAccount}
      </Link>
    </>
  );
}
