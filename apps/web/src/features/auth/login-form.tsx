'use client';
import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AuthErrorNotice, AuthField, PasswordField } from './auth-fields';
import { readDeviceName, readSafeReturnTo, withReturnTo } from './auth-return';
import { GoogleButton } from './google-button';

/** Trang /login: chỉ đăng nhập. Tạo tài khoản nằm ở trang riêng /register (register-form.tsx). */
export function LiveLogin({ returnTo }: { returnTo?: string }) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const goBack = useCallback(
    () => router.replace(readSafeReturnTo(returnTo ?? '/account')),
    [router, returnTo],
  );

  const credentials = useMutation({
    mutationFn: () => session.login({ email: email.trim(), password, deviceName: readDeviceName() }),
    onSuccess: () => {
      setPassword('');
      goBack();
    },
  });
  const google = useMutation({
    mutationFn: (idToken: string) => session.loginWithGoogle({ idToken, deviceName: readDeviceName() }),
    onSuccess: goBack,
  });
  const { mutate: signInWithGoogle } = google;
  const isBusy = credentials.isPending || google.isPending;

  return (
    <>
      <h2 className="auth-panel-title">{vi.api.authLoginTitle}</h2>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isBusy) credentials.mutate();
        }}
      >
        <AuthField
          id="auth-email"
          label={vi.api.email}
          type="email"
          required
          isFloating
          leadingIcon="mail"
          maxLength={254}
          autoComplete="email"
          value={email}
          disabled={isBusy}
          onValueChange={(value) => {
            setEmail(value);
            credentials.reset();
          }}
        />
        <PasswordField
          id="auth-password"
          label={vi.api.password}
          required
          isFloating
          leadingIcon="lock"
          autoComplete="current-password"
          value={password}
          disabled={isBusy}
          onValueChange={setPassword}
        />
        {/* Ngay dưới ô mật khẩu, căn phải: chỗ người dùng tìm khi quên. */}
        <Link className="auth-forgot" href="/forgot-password" prefetch={false}>
          {vi.api.forgotPassword}
        </Link>
        <AuthErrorNotice error={credentials.error} action="login" />
        <button className="primary-button auth-submit" disabled={!isReady || isBusy}>
          {credentials.isPending ? vi.api.loggingIn : vi.api.login}
        </button>
      </form>
      <GoogleButton onCredential={signInWithGoogle} />
      <AuthErrorNotice error={google.error} action="google" />
      <Link className="secondary-button auth-create" href={withReturnTo('/register', returnTo)} prefetch={false}>
        {vi.api.authCreateAccount}
      </Link>
    </>
  );
}
