'use client';
import { getRetryAfterSeconds, useApiSession, useResendCooldown } from '@tripflix/api-client';
import {
  canSendRegistrationCode,
  describeDevice,
  DISPLAY_NAME_MAX,
  NEW_PASSWORD_MAX,
  getRegistrationPasswordStrength,
  REGISTRATION_CODE_PATTERN,
  REGISTRATION_PASSWORD_MIN,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
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
  return /^\/(?:account|trips\/[^/?#]+|search|flights|bookings|hotels\/[^/?#]+|checkout\/[^/?#]+)(?:$|[?#])/.test(
    returnTo,
  )
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
  const [code, setCode] = useState('');
  const [registrationId, setRegistrationId] = useState<string>();
  const isRegistering = mode === 'register';
  const strength = getRegistrationPasswordStrength(password);
  const goBack = useCallback(() => router.replace(readSafeReturnTo(returnTo)), [router, returnTo]);

  const cooldown = useResendCooldown();
  const requestCode = useMutation({
    mutationFn: () => session.sendRegistrationCode({ email: email.trim(), password }),
    onSuccess: ({ registrationId: id, resendAfterSeconds }) => {
      setRegistrationId(id);
      setCode('');
      cooldown.start(resendAfterSeconds);
    },
    onError: (err) => {
      const seconds = getRetryAfterSeconds(err);
      if (seconds) cooldown.start(seconds);
    },
  });
  // 429 vì bấm quá sớm: nút đã đếm ngược, thay câu lỗi chung bằng số giây còn lại.
  const isTooSoon = cooldown.isWaiting && getRetryAfterSeconds(requestCode.error) !== undefined;
  const canSendCode = canSendRegistrationCode({ displayName, email, password });
  // Email, mật khẩu đã ổn mà còn thiếu tên: báo rõ vì sao nút gửi mã đang khoá.
  const isMissingName = !displayName.trim() && strength === 'passwordStrong' && !!email.trim();
  const canRegister = canSendCode && !!registrationId && REGISTRATION_CODE_PATTERN.test(code);

  const credentials = useMutation({
    mutationFn: () =>
      isRegistering
        ? session.register({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            registrationId: registrationId ?? '',
            code,
          })
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
  const isBusy = credentials.isPending || google.isPending || requestCode.isPending;

  const switchMode = (next: Mode) => {
    setMode(next);
    credentials.reset();
    google.reset();
    requestCode.reset();
    cooldown.clear();
    setCode('');
    setRegistrationId(undefined);
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
          if (!isBusy && (!isRegistering || canRegister)) credentials.mutate();
        }}
      >
        {isRegistering && (
          <AuthField
            id="auth-display-name"
            label={vi.api.displayName}
            required
            maxChars={DISPLAY_NAME_MAX}
            autoComplete="name"
            value={displayName}
            onValueChange={setDisplayName}
            aria-invalid={isMissingName || undefined}
            aria-describedby={isMissingName ? 'registration-needs-name' : undefined}
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
          disabled={isBusy}
          onValueChange={(value) => {
            setEmail(value);
            setCode('');
            setRegistrationId(undefined);
            requestCode.reset();
            cooldown.clear();
            credentials.reset();
          }}
        />
        <PasswordField
          id="auth-password"
          label={vi.api.password}
          required
          minLength={isRegistering ? REGISTRATION_PASSWORD_MIN : 1}
          maxChars={isRegistering ? NEW_PASSWORD_MAX : undefined}
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          value={password}
          disabled={isBusy}
          onValueChange={setPassword}
          aria-describedby={isRegistering ? 'registration-password-strength' : undefined}
        />
        {isRegistering ? (
          <>
            <p
              id="registration-password-strength"
              className={
                !password ? 'auth-hint' : strength === 'passwordStrong' ? 'auth-success' : 'auth-error'
              }
              aria-live="polite"
            >
              {password ? vi.api[strength] : vi.api.registerHint}
            </p>
            <AuthField
              id="auth-email-code"
              label={vi.api.registrationCodeLabel}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              disabled={isBusy || !registrationId}
              value={code}
              onValueChange={(value) => setCode(value.replace(/[^0-9]/g, ''))}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={!isReady || isBusy || cooldown.isWaiting || !canSendCode}
              onClick={() => {
                credentials.reset();
                requestCode.mutate();
              }}
            >
              {requestCode.isPending
                ? vi.api.sending
                : cooldown.isWaiting
                  ? t('api.registrationResendIn', { seconds: cooldown.secondsLeft })
                  : registrationId
                    ? vi.api.registrationResendCode
                    : vi.api.registrationSendCode}
            </button>
            {isMissingName && (
              <p id="registration-needs-name" className="auth-warning" role="status">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                {vi.api.registrationNeedsName}
              </p>
            )}
            {registrationId && <output className="auth-hint">{vi.api.registrationCodeSent}</output>}
            {isTooSoon ? (
              <p role="alert" className="auth-error">
                {t('api.registrationCodeTooSoon', { seconds: cooldown.secondsLeft })}
              </p>
            ) : (
              <AuthErrorNotice error={requestCode.error} action="register" />
            )}
          </>
        ) : (
          <Link className="auth-link auth-forgot" href="/forgot-password">
            {vi.api.forgotPassword}
          </Link>
        )}
        <AuthErrorNotice error={credentials.error} action={mode} />
        <button
          className="primary-button auth-submit"
          disabled={!isReady || isBusy || (isRegistering && !canRegister)}
        >
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
