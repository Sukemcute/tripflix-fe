'use client';
import { getRetryAfterSeconds, useApiSession, useResendCooldown } from '@tripflix/api-client';
import {
  canSendRegistrationCode,
  COMMON_NATIONALITIES,
  DISPLAY_NAME_MAX,
  getRegistrationPasswordStrength,
  getSignupProfileIssue,
  NEW_PASSWORD_MAX,
  REGISTRATION_CODE_PATTERN,
  REGISTRATION_PASSWORD_MIN,
  SIGNUP_GENDERS,
  type SignupGender,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { SoftSelect, type SoftSelectOption } from '@/features/shared/soft-select';
import { AuthErrorNotice, AuthField, PasswordField } from './auth-fields';
import { DateOfBirthSelect } from './date-of-birth-select';
import { readDeviceName, readSafeReturnTo, withReturnTo } from './auth-return';
import { GoogleButton } from './google-button';

const CODE_ONLY_NATIONALITIES: SoftSelectOption[] = COMMON_NATIONALITIES.map((code) => ({
  value: code,
  label: code,
}));

/**
 * Tên quốc gia tiếng Việt từ Intl.DisplayNames. Chỉ dịch sau khi trang đã chạy ở trình duyệt: Node và trình duyệt
 * dịch khác nhau (ví dụ Hồng Kông), dịch ngay lúc render sẽ lệch HTML của server (lỗi hydration).
 */
const subscribeNever = () => () => {};

function useNationalityOptions(): SoftSelectOption[] {
  // false khi render ở server và lúc hydrate, true sau đó: tên chỉ dịch ở trình duyệt.
  const isBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  return useMemo(() => {
    if (!isBrowser || typeof Intl.DisplayNames !== 'function') return CODE_ONLY_NATIONALITIES;
    const names = new Intl.DisplayNames(['vi'], { type: 'region' });
    return COMMON_NATIONALITIES.map((code) => ({ value: code, label: names.of(code) ?? code }));
  }, [isBrowser]);
}
const GENDER_OPTIONS = SIGNUP_GENDERS.map((gender) => ({
  value: gender,
  label: vi.api.genderOptions[gender],
}));

/** Ô có nhãn phía trên, dùng cho bộ chọn ngày, bộ chọn (không phải <input> thường). */
function PickerField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="auth-field auth-picker">
      <div className="auth-label-row">
        <label htmlFor={id}>{label}</label>
      </div>
      {children}
    </div>
  );
}

/**
 * Trang /register: một thẻ rộng hai cột trong khung chung với trang đăng nhập (app/(auth)/layout.tsx).
 * Trái: tên, email, mật khẩu; phải: ngày sinh, giới tính, quốc tịch; dưới: đồng ý điều khoản, gửi mã.
 * Gửi mã xong, ô nhập mã hiện ngay trong thẻ và nút chính thành "Tạo tài khoản" (đăng ký bằng mã, TF05D).
 */
export function LiveRegister({ returnTo }: { returnTo?: string }) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('VN');
  const [hasAcceptedTerms, setAcceptedTerms] = useState(false);
  const [hasTriedSubmit, setTriedSubmit] = useState(false);
  const [code, setCode] = useState('');
  const [registrationId, setRegistrationId] = useState<string>();
  const nationalityOptions = useNationalityOptions();
  const strength = getRegistrationPasswordStrength(password);
  const goBack = useCallback(
    () => router.replace(readSafeReturnTo(returnTo ?? '/account')),
    [router, returnTo],
  );

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
  const hasAccountDetails = canSendRegistrationCode({ displayName, email, password });
  // Email, mật khẩu đã ổn mà còn thiếu tên: báo rõ vì sao chưa gửi mã được.
  const isMissingName = !displayName.trim() && strength === 'passwordStrong' && !!email.trim();
  const profileIssue = getSignupProfileIssue({ dateOfBirth, gender, nationality, hasAcceptedTerms });
  const visibleIssue = hasTriedSubmit ? profileIssue : null;
  const canSendCode = hasAccountDetails && !profileIssue;
  const canRegister = canSendCode && !!registrationId && REGISTRATION_CODE_PATTERN.test(code);

  const register = useMutation({
    mutationFn: () =>
      session.register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        registrationId: registrationId ?? '',
        code,
        dateOfBirth,
        // getSignupProfileIssue đã chặn giá trị ngoài SIGNUP_GENDERS (canSendCode).
        gender: gender as SignupGender,
        nationality,
        acceptTerms: true,
      }),
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
  const isBusy = register.isPending || google.isPending || requestCode.isPending;

  // Mã vừa gửi: đưa con trỏ vào ô mã để gõ ngay (người dùng vừa bấm gửi mã, nên không bất ngờ).
  useEffect(() => {
    if (registrationId) document.getElementById('auth-email-code')?.focus();
  }, [registrationId]);

  return (
    <>
      <h2 className="auth-panel-title">{vi.api.authRegisterPageTitle}</h2>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTriedSubmit(true);
          if (isBusy || !canSendCode) return;
          if (registrationId) {
            if (canRegister) register.mutate();
          } else if (!cooldown.isWaiting) {
            requestCode.mutate();
          }
        }}
      >
        <div className="auth-register-grid">
          <AuthField
            id="auth-display-name"
            label={vi.api.displayName}
            required
            maxChars={DISPLAY_NAME_MAX}
            autoComplete="name"
            value={displayName}
            onValueChange={setDisplayName}
            aria-invalid={isMissingName || (hasTriedSubmit && !displayName.trim()) || undefined}
            aria-describedby={isMissingName ? 'registration-needs-name' : undefined}
          />
          <PickerField id="auth-dob" label={vi.api.dateOfBirth}>
            <DateOfBirthSelect
              id="auth-dob"
              onChange={setDateOfBirth}
              isInvalid={
                visibleIssue === 'signupDateOfBirthMissing' || visibleIssue === 'signupAgeOutOfRange'
              }
            />
          </PickerField>
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
              register.reset();
            }}
          />
          <div className="auth-field-pair">
            <PickerField id="auth-gender" label={vi.api.gender}>
              <SoftSelect
                id="auth-gender"
                value={gender}
                onChange={setGender}
                options={[{ value: '', label: vi.api.genderUnset }, ...GENDER_OPTIONS]}
                aria-invalid={visibleIssue === 'signupGenderMissing' || undefined}
              />
            </PickerField>
            <PickerField id="auth-nationality" label={vi.api.nationality}>
              <SoftSelect
                id="auth-nationality"
                value={nationality}
                onChange={setNationality}
                options={nationalityOptions}
                aria-invalid={visibleIssue === 'signupNationalityMissing' || undefined}
              />
            </PickerField>
          </div>
          <div className="is-wide">
            <PasswordField
              id="auth-password"
              label={vi.api.password}
              required
              minLength={REGISTRATION_PASSWORD_MIN}
              maxChars={NEW_PASSWORD_MAX}
              autoComplete="new-password"
              value={password}
              disabled={isBusy}
              onValueChange={setPassword}
              aria-describedby={password ? 'registration-password-strength' : undefined}
            />
          </div>
        </div>
        {password && (
          <p
            id="registration-password-strength"
            className={strength === 'passwordStrong' ? 'auth-strength is-strong' : 'auth-strength'}
            aria-live="polite"
          >
            {vi.api[strength]}
          </p>
        )}
        {isMissingName && (
          <p id="registration-needs-name" className="auth-warning" role="status">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            {vi.api.registrationNeedsName}
          </p>
        )}
        <label className="auth-terms">
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            aria-invalid={visibleIssue === 'signupTermsRequired' || undefined}
          />
          <span>
            {vi.api.termsAgreePrefix}{' '}
            <Link href="/dieu-khoan-su-dung" target="_blank">
              {vi.terms.title}
            </Link>{' '}
            {vi.api.termsAnd}{' '}
            <Link href="/chinh-sach-bao-mat" target="_blank">
              {vi.privacy.title}
            </Link>
            {vi.api.termsAgreeSuffix}
          </span>
        </label>
        {visibleIssue && hasAccountDetails && (
          <p role="alert" className="auth-error">
            {vi.api[visibleIssue]}
          </p>
        )}
        {registrationId && (
          <div className="auth-code-block">
            <div className="auth-code-row">
              <AuthField
                id="auth-email-code"
                label={vi.api.registrationCodeLabel}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                disabled={isBusy}
                value={code}
                onValueChange={(value) => setCode(value.replace(/[^0-9]/g, ''))}
              />
              <button
                type="button"
                className="auth-text-button is-accent"
                disabled={!isReady || isBusy || cooldown.isWaiting || !canSendCode}
                onClick={() => {
                  register.reset();
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
            <output className="auth-hint">{vi.api.registrationCodeSent}</output>
          </div>
        )}
        {isTooSoon ? (
          <p role="alert" className="auth-error">
            {t('api.registrationCodeTooSoon', { seconds: cooldown.secondsLeft })}
          </p>
        ) : (
          <AuthErrorNotice error={requestCode.error} action="register" />
        )}
        <AuthErrorNotice error={register.error} action="register" />
        <button
          className="primary-button auth-submit"
          disabled={
            !isReady ||
            isBusy ||
            !hasAccountDetails ||
            (registrationId ? !REGISTRATION_CODE_PATTERN.test(code) : cooldown.isWaiting)
          }
        >
          {register.isPending
            ? vi.api.loggingIn
            : requestCode.isPending
              ? vi.api.sending
              : registrationId
                ? vi.api.register
                : cooldown.isWaiting
                  ? t('api.registrationResendIn', { seconds: cooldown.secondsLeft })
                  : vi.api.registrationSendCode}
        </button>
      </form>
      {/* Đang nhập mã thì bỏ phần Google cho thẻ gọn, vừa một màn hình. */}
      {!registrationId && (
        <>
          <GoogleButton onCredential={signInWithGoogle} />
          <AuthErrorNotice error={google.error} action="google" />
        </>
      )}
      <Link className="auth-link auth-switch" href={withReturnTo('/login', returnTo)}>
        {vi.api.haveAccount}
      </Link>
    </>
  );
}
