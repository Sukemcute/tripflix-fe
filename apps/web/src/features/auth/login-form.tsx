'use client';
import { getRetryAfterSeconds, useApiSession, useResendCooldown } from '@tripflix/api-client';
import { REGISTRATION_CODE_PATTERN } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAfterAuth } from '@/features/onboarding/use-after-auth';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AuthErrorNotice, AuthField, PasswordField } from './auth-fields';
import { readDeviceName, withReturnTo } from './auth-return';
import { GoogleButton } from './google-button';

/**
 * Trang /login: đăng nhập bằng mật khẩu qua 2 bước (kiểm tra mật khẩu → gửi mã xác thực 8 số về email → nhập mã).
 * Tạo tài khoản nằm ở trang riêng /register (register-form.tsx).
 */
export function LiveLogin({ returnTo }: { returnTo?: string }) {
  const { session, isReady, error } = useApiSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loginChallengeId, setLoginChallengeId] = useState<string>();
  // Về trang cũ, hoặc mở khảo sát sở thích nếu hồ sơ chưa làm (SCRUM-160).
  const goBack = useAfterAuth(returnTo);

  const cooldown = useResendCooldown();
  const requestCode = useMutation({
    mutationFn: () => session.sendLoginCode({ email: email.trim(), password }),
    onSuccess: ({ loginChallengeId: id, resendAfterSeconds }) => {
      setLoginChallengeId(id);
      setCode('');
      cooldown.start(resendAfterSeconds);
    },
    onError: (err) => {
      const seconds = getRetryAfterSeconds(err);
      if (seconds) cooldown.start(seconds);
    },
  });
  const isTooSoon = cooldown.isWaiting && getRetryAfterSeconds(requestCode.error) !== undefined;
  const hasCredentials = !!email.trim() && !!password;
  const canLogin = hasCredentials && !!loginChallengeId && REGISTRATION_CODE_PATTERN.test(code);

  const credentials = useMutation({
    mutationFn: () =>
      session.login({
        email: email.trim(),
        password,
        deviceName: readDeviceName(),
        loginChallengeId: loginChallengeId ?? '',
        code,
      }),
    onSuccess: () => {
      setPassword('');
      setCode('');
      goBack();
    },
  });
  const google = useMutation({
    mutationFn: (idToken: string) => session.loginWithGoogle({ idToken, deviceName: readDeviceName() }),
    onSuccess: goBack,
  });
  const { mutate: signInWithGoogle } = google;
  const isBusy = credentials.isPending || google.isPending || requestCode.isPending;

  useEffect(() => {
    if (loginChallengeId) document.getElementById('auth-login-code')?.focus();
  }, [loginChallengeId]);

  const resetChallenge = () => {
    setCode('');
    setLoginChallengeId(undefined);
    requestCode.reset();
    cooldown.clear();
    credentials.reset();
  };

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
          if (isBusy || !hasCredentials) return;
          if (loginChallengeId) {
            if (canLogin) credentials.mutate();
          } else if (!cooldown.isWaiting) {
            requestCode.mutate();
          }
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
            resetChallenge();
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
          onValueChange={(value) => {
            setPassword(value);
            resetChallenge();
          }}
        />
        {/* Ngay dưới ô mật khẩu, căn phải: chỗ người dùng tìm khi quên. */}
        <Link className="auth-forgot" href="/forgot-password" prefetch={false}>
          {vi.api.forgotPassword}
        </Link>
        {loginChallengeId && (
          <div className="auth-code-block">
            <div className="auth-code-row">
              <AuthField
                id="auth-login-code"
                label={vi.api.registrationCodeLabel}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                disabled={isBusy}
                value={code}
                onValueChange={(value) => {
                  setCode(value.replace(/[^0-9]/g, ''));
                  credentials.reset();
                }}
              />
              <button
                type="button"
                className="auth-text-button is-accent"
                disabled={!isReady || isBusy || cooldown.isWaiting || !hasCredentials}
                onClick={() => {
                  credentials.reset();
                  requestCode.mutate();
                }}
              >
                {requestCode.isPending
                  ? vi.api.sending
                  : cooldown.isWaiting
                    ? t('api.registrationResendIn', { seconds: cooldown.secondsLeft })
                    : vi.api.registrationResendCode}
              </button>
            </div>
            <output className="auth-hint">{vi.api.loginCodeSent}</output>
          </div>
        )}
        {isTooSoon ? (
          <p role="alert" className="auth-error">
            {t('api.registrationCodeTooSoon', { seconds: cooldown.secondsLeft })}
          </p>
        ) : (
          <AuthErrorNotice error={requestCode.error} action="login" />
        )}
        <AuthErrorNotice error={credentials.error} action="login" />
        <button
          className="primary-button auth-submit"
          disabled={
            !isReady ||
            isBusy ||
            !hasCredentials ||
            (loginChallengeId ? !REGISTRATION_CODE_PATTERN.test(code) : cooldown.isWaiting)
          }
        >
          {credentials.isPending
            ? vi.api.loggingIn
            : requestCode.isPending
              ? vi.api.sending
              : loginChallengeId
                ? vi.api.login
                : cooldown.isWaiting
                  ? t('api.registrationResendIn', { seconds: cooldown.secondsLeft })
                  : vi.api.login}
        </button>
      </form>
      {!loginChallengeId && (
        <>
          <GoogleButton onCredential={signInWithGoogle} />
          <AuthErrorNotice error={google.error} action="google" />
        </>
      )}
      <Link className="secondary-button auth-create" href={withReturnTo('/register', returnTo)} prefetch={false}>
        {vi.api.authCreateAccount}
      </Link>
    </>
  );
}
