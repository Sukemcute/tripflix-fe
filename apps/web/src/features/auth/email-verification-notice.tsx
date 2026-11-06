'use client';

import { readEntity, useApiSession } from '@tripflix/api-client';
import { emailVerificationControllerResend } from '@tripflix/api-client/core-api/auth/auth';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import { ApiErrorNotice } from '@/features/shared/api-state';

export function EmailVerificationNotice() {
  const { session } = useApiSession();
  const resend = useMutation({
    mutationFn: async () => {
      const response = await emailVerificationControllerResend();
      const data = readEntity(response.data, ['status']);
      if (data.status === 'already_verified') await session.refreshUser();
      return data.status;
    },
  });
  const check = useMutation({ mutationFn: () => session.refreshUser() });
  const isBusy = resend.isPending || check.isPending;

  return (
    <section className="profile-card" aria-label={vi.api.verifyEmailTitle}>
      <p>{vi.api.emailUnverified}</p>
      <div className="account-guest-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isBusy}
          onClick={() => {
            check.reset();
            resend.mutate();
          }}
        >
          {resend.isPending ? vi.api.sending : vi.api.verifyEmailResend}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={isBusy}
          onClick={() => {
            resend.reset();
            check.mutate();
          }}
        >
          {check.isPending ? vi.api.loading : vi.api.verifyEmailCheck}
        </button>
      </div>
      {resend.data === 'sent' && <output>{vi.api.verifyEmailSent}</output>}
      {check.isSuccess && <output>{vi.api.verifyEmailStillPending}</output>}
      <ApiErrorNotice error={resend.error ?? check.error} />
    </section>
  );
}
