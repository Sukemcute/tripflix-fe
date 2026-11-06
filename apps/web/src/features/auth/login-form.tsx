'use client';
import { useApiSession } from '@tripflix/api-client';
import { describeDevice } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AuthErrorNotice, AuthField, PasswordField } from './auth-fields';
import { AuthShell } from './auth-shell';
import { GoogleButton } from './google-button';

type Mode = 'login' | 'register';

/** Chỉ quay lại các trang của web, không chuyển hướng sang địa chỉ lạ truyền qua ?returnTo=. */
function readSafeReturnTo(returnTo: string): string {
  return /^\/(?:account|trips\/[^/?#]+|search|bookings|hotels\/[^/?#]+|checkout\/[^/?#]+)(?:$|[?#])/.test(returnTo)
    ? returnTo
    : '/account';
}

const readDeviceName = () => describeDevice(navigator.userAgent) ?? undefined;

export function LiveLogin({
  returnTo = '/account',
  initialMode = 'login',
}: {
  returnTo?: string;
  /** Tab mở sẵn, ví dụ ?mode=register từ nút "Tạo tài khoản". */
  initialMode?: Mode;
}) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const isRegistering = mode === 'register';
  const goBack = useCallback(() => router.replace(readSafeReturnTo(returnTo)), [router, returnTo]);

  const credentials = useMutation({
    mutationFn: () =>
      isRegistering
        ? session.register({ email: email.trim(), password, displayName: displayName.trim() })
        : session.login({ email: email.trim(), password, deviceName: readDeviceName() }),
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

  const switchMode = (next: Mode) => {
    setMode(next);
    credentials.reset();
    google.reset();
  };

  return (
    <AuthShell story={mode}>
      <fieldset className="auth-tabs" aria-label={vi.api.account}>
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={mode === tab}
            disabled={isBusy}
            onClick={() => switchMode(tab)}
          >
            {tab === 'login' ? vi.api.login : vi.api.register}
          </button>
        ))}
      </fieldset>
      <h2>{isRegistering ? vi.api.register : vi.api.login}</h2>
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
          credentials.mutate();
        }}
      >
        {isRegistering && (
          <AuthField
            id="auth-display-name"
            label={vi.api.displayName}
            required
            maxLength={50}
            autoComplete="name"
            value={displayName}
            onValueChange={setDisplayName}
          />
        )}
        <AuthField
          id="auth-email"
          label={vi.api.email}
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onValueChange={setEmail}
        />
        <PasswordField
          id="auth-password"
          label={vi.api.password}
          required
          minLength={isRegistering ? 8 : 1}
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          value={password}
          onValueChange={setPassword}
        />
        {isRegistering ? (
          <p className="auth-hint">{vi.api.registerHint}</p>
        ) : (
          <Link className="auth-link auth-forgot" href="/forgot-password">
            {vi.api.forgotPassword}
          </Link>
        )}
        <AuthErrorNotice error={credentials.error} action={mode} />
        <button className="primary-button auth-submit" disabled={!isReady || isBusy}>
          {credentials.isPending ? vi.api.loggingIn : isRegistering ? vi.api.register : vi.api.login}
        </button>
      </form>
      <GoogleButton onCredential={signInWithGoogle} />
      <AuthErrorNotice error={google.error} action="google" />
      <button
        type="button"
        className="auth-link auth-switch"
        disabled={isBusy}
        onClick={() => switchMode(isRegistering ? 'login' : 'register')}
      >
        {isRegistering ? vi.api.haveAccount : vi.api.noAccount}
      </button>
    </AuthShell>
  );
}
