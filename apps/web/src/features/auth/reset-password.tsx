'use client';
import { getAuthErrorKind } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AuthErrorNotice, PasswordField } from './auth-fields';
import { AuthShell } from './auth-shell';

/** Trang mở từ link trong email: /dat-lai-mat-khau?token=... (khớp AUTH_PASSWORD_RESET_URL của BE). */
export function ResetPassword({ token }: { token: string | undefined }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isMismatch, setMismatch] = useState(false);
  const reset = useMutation({
    mutationFn: () => auth.passwordResetControllerReset({ token: token ?? '', newPassword }),
  });
  const isLinkInvalid = !token || getAuthErrorKind(reset.error, 'resetPassword') === 'resetLinkInvalid';

  return (
    <AuthShell>
      <h2>{vi.api.resetTitle}</h2>
      {reset.isSuccess ? (
        <>
          <output className="auth-success">{vi.api.resetSuccess}</output>
          <Link className="primary-button auth-submit" href="/login">
            {vi.api.login}
          </Link>
        </>
      ) : isLinkInvalid ? (
        <>
          <p role="alert" className="auth-error">
            {token ? vi.api.resetLinkInvalid : vi.api.resetMissingToken}
          </p>
          <Link className="primary-button auth-submit" href="/forgot-password">
            {vi.api.requestNewLink}
          </Link>
        </>
      ) : (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            const isSame = newPassword === confirmation;
            setMismatch(!isSame);
            if (isSame) reset.mutate();
          }}
        >
          <p className="auth-hint">{vi.api.resetBody}</p>
          <PasswordField
            id="reset-password"
            label={vi.api.newPassword}
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onValueChange={setNewPassword}
          />
          <PasswordField
            id="reset-password-confirm"
            label={vi.api.confirmPassword}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onValueChange={setConfirmation}
          />
          {isMismatch && (
            <p role="alert" className="auth-error">
              {vi.api.passwordMismatch}
            </p>
          )}
          <AuthErrorNotice error={reset.error} action="resetPassword" />
          <button className="primary-button auth-submit" disabled={reset.isPending}>
            {reset.isPending ? vi.api.saving : vi.api.resetSubmit}
          </button>
        </form>
      )}
      <Link className="auth-link auth-switch" href="/login">
        {vi.api.backToLogin}
      </Link>
    </AuthShell>
  );
}
