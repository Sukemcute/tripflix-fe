'use client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AuthErrorNotice, AuthField } from './auth-fields';

/** BE luôn trả 202 với cùng một câu, kể cả email không có tài khoản, nên trang cũng chỉ báo một câu. */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const request = useMutation({
    mutationFn: () => auth.passwordResetControllerForgot({ email: email.trim() }),
  });
  return (
    <>
      <h2>{vi.api.forgotTitle}</h2>
      <p className="auth-hint">{vi.api.forgotBody}</p>
      {request.isSuccess ? (
        <output className="auth-success">{vi.api.forgotSent}</output>
      ) : (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            request.mutate();
          }}
        >
          <AuthField
            id="forgot-email"
            label={vi.api.email}
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onValueChange={setEmail}
          />
          <AuthErrorNotice error={request.error} action="forgotPassword" />
          <button className="primary-button auth-submit" disabled={request.isPending}>
            {request.isPending ? vi.api.sending : vi.api.sendResetLink}
          </button>
        </form>
      )}
      <Link className="auth-link auth-switch" href="/login">
        {vi.api.backToLogin}
      </Link>
    </>
  );
}
