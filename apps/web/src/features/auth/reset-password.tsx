'use client';
import { getAuthErrorKind, resetPassword } from '@tripflix/api-client';
import { NEW_PASSWORD_MAX } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AuthErrorNotice, PasswordField } from './auth-fields';

/** Trang mở từ link trong email: /dat-lai-mat-khau?token=... (khớp AUTH_PASSWORD_RESET_URL của BE). */
export function ResetPassword({ token }: { token: string | undefined }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isMismatch, setMismatch] = useState(false);
  const reset = useMutation({
    // Mật khẩu mới được mã hoá trước khi gửi (TF056).
    mutationFn: () => resetPassword({ token: token ?? '', newPassword }),
  });
  const isLinkInvalid = !token || getAuthErrorKind(reset.error, 'resetPassword') === 'resetLinkInvalid';

  return (
    <>
      <h2>{vi.api.resetTitle}</h2>
      {reset.isSuccess ? (
        <>
          <output className="auth-success">{vi.api.resetSuccess}</output>
          <Link prefetch={false} className="primary-button auth-submit" href="/login">
            {vi.api.login}
          </Link>
        </>
      ) : isLinkInvalid ? (
        <>
          <p role="alert" className="auth-error">
            {token ? vi.api.resetLinkInvalid : vi.api.resetMissingToken}
          </p>
          <Link prefetch={false} className="primary-button auth-submit" href="/forgot-password">
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
            maxChars={NEW_PASSWORD_MAX}
            autoComplete="new-password"
            value={newPassword}
            onValueChange={setNewPassword}
          />
          <PasswordField
            id="reset-password-confirm"
            label={vi.api.confirmPassword}
            required
            minLength={8}
            maxChars={NEW_PASSWORD_MAX}
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
      <Link prefetch={false} className="auth-link auth-switch" href="/login">
        {vi.api.backToLogin}
      </Link>
    </>
  );
}
