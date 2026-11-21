import {
  getAuthErrorKind,
  getRegistrationFieldError,
  getRetryAfterSeconds,
  HttpError,
  useApiSession,
  useResendCooldown,
} from '@tripflix/api-client';
import {
  canSendRegistrationCode,
  COMMON_NATIONALITIES,
  CURRENT_PASSWORD_MAX,
  DISPLAY_NAME_MAX,
  getRegistrationPasswordStrength,
  getSignupProfileIssue,
  NEW_PASSWORD_MAX,
  parseDayMonthYear,
  REGISTRATION_CODE_PATTERN,
  resolveMobileLoginReturn,
  SIGNUP_GENDERS,
  type SignupGender,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts, spacing as s } from '@tripflix/tokens';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { assets, copy, Icon, Logo, Screen, Txt } from '@/components/mobile-ui';
import {
  AuthButton as Button,
  AuthChoice as Chip,
  AuthField as Field,
  AuthNotice as Notice,
  AuthErrorNotice as ApiErrorNotice,
  AuthSheet as Sheet,
  authInputFrame,
} from './auth-ui';
import { GoogleLoginButton } from '@/features/auth/google-login-button';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { needsAccountOnboarding } from '@/features/onboarding/onboarding-model';

const regionNames =
  typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['vi'], { type: 'region' }) : null;
const describeNationality = (code: string) => regionNames?.of(code) ?? code;
/** Địa chỉ web để mở Điều khoản, Chính sách từ app; chưa đặt thì chỉ hiện chữ. */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');

function registrationField(error: unknown): string | undefined {
  if (!getRegistrationFieldError(error) || !(error instanceof HttpError)) return;
  const field = (error.body as { errors: { field?: unknown }[] }).errors[0]?.field;
  if (typeof field !== 'string') return;
  return field === 'encPassword' ? 'password' : field;
}

/** Chữ có thể bấm mở trang web (khi đã cấu hình EXPO_PUBLIC_WEB_URL). */
function WebLinkText({ path, children }: { path: string; children: string }) {
  if (!WEB_URL)
    return (
      <Txt variant="small" style={styles.termsLink}>
        {children}
      </Txt>
    );
  return (
    <Txt
      variant="small"
      accessibilityRole="link"
      style={[styles.termsLink, { color: x.day.text }]}
      onPress={() => void Linking.openURL(`${WEB_URL}${path}`)}
    >
      {children}
    </Txt>
  );
}

export function LiveLoginScreen() {
  const { session, isReady } = useApiSession();
  const { startForAccount, ready: onboardingReady } = useOnboarding();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [isRegistering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { height, fontScale } = useWindowDimensions();
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [registrationId, setRegistrationId] = useState<string>();
  // Thông tin cá nhân và đồng ý điều khoản, bắt buộc khi đăng ký (TF06O).
  const [birthText, setBirthText] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('VN');
  const [hasAcceptedTerms, setAcceptedTerms] = useState(false);
  const [isNationalityOpen, setNationalityOpen] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const touch = (name: string) => setTouched((current) => ({ ...current, [name]: true }));
  const isEmailValid = email.trim().length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const dateOfBirth = parseDayMonthYear(birthText);
  const profileIssue = getSignupProfileIssue({ dateOfBirth, gender, nationality, hasAcceptedTerms });
  const strength = getRegistrationPasswordStrength(password);
  const cooldown = useResendCooldown();
  const requestCode = useMutation({
    mutationFn: () => session.sendRegistrationCode({ email: email.trim() }),
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
  const hasAccountDetails = canSendRegistrationCode({ displayName, email, password });
  const canSendCode = hasAccountDetails && isEmailValid && !profileIssue;
  const canRegister = canSendCode && !!registrationId && REGISTRATION_CODE_PATTERN.test(code);
  const mutation = useMutation({
    mutationFn: async () => {
      if (isRegistering) {
        await session.register({
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
        });
        return;
      }
      await session.login({ email: email.trim(), password });
    },
    onSuccess: () => {
      setPassword('');
      leaveAfterLogin();
    },
  });
  function leaveAfterLogin() {
    const profile = session.getSnapshot().user;
    const destination = resolveMobileLoginReturn(returnTo);
    if (profile && needsAccountOnboarding(profile)) {
      startForAccount();
      router.replace({ pathname: '/onboarding', params: { source: 'account', returnTo: destination } });
    } else router.dismissTo(destination as Href);
  }
  const isBusy = mutation.isPending || requestCode.isPending;
  const registrationError = (error: unknown) => {
    const fieldError = getRegistrationFieldError(error);
    const kind = getAuthErrorKind(error, 'register');
    return fieldError ?? (kind ? vi.api[kind] : undefined);
  };
  const formError = isRegistering ? registrationError(mutation.error) : undefined;
  const inlineSource = mutation.error ?? requestCode.error;
  const inlineField = isRegistering ? registrationField(inlineSource) : undefined;
  const hasInlineError =
    !!inlineField && ['displayName', 'email', 'password', 'dateOfBirth', 'code'].includes(inlineField);
  const serverFieldError = (name: string) =>
    hasInlineError && inlineField === name ? getRegistrationFieldError(inlineSource) : undefined;
  const localErrors: Record<string, string | undefined> = {
    email: !email.trim()
      ? vi.api.mobileAuthEmailRequired
      : !isEmailValid
        ? vi.api.mobileAuthEmailInvalid
        : undefined,
    password: !password
      ? vi.api.mobileAuthPasswordRequired
      : isRegistering && strength !== 'passwordStrong'
        ? vi.api[strength]
        : undefined,
    displayName: !displayName.trim() ? vi.api.mobileAuthNameRequired : undefined,
    dateOfBirth:
      profileIssue === 'signupDateOfBirthMissing'
        ? vi.api.mobileAuthBirthInvalid
        : profileIssue === 'signupAgeOutOfRange'
          ? vi.api.mobileAuthAgeInvalid
          : undefined,
    code: registrationId && !REGISTRATION_CODE_PATTERN.test(code) ? vi.api.mobileAuthNeedFullCode : undefined,
    gender: !gender ? vi.api.signupGenderMissing : undefined,
    terms: !hasAcceptedTerms ? vi.api.signupTermsRequired : undefined,
  };
  const fieldError = (name: string) =>
    serverFieldError(name) ?? (touched[name] ? localErrors[name] : undefined);
  // 429 vì bấm quá sớm: nút đã đếm ngược, thay câu lỗi chung bằng số giây còn lại.
  const sendError =
    cooldown.isWaiting && getRetryAfterSeconds(requestCode.error) !== undefined
      ? t('api.registrationCodeTooSoon', { seconds: cooldown.secondsLeft })
      : registrationError(requestCode.error);
  const bookingContext =
    typeof returnTo === 'string' && /^\/(cart|checkout|flights|payments|\(tabs\)\/book)/.test(returnTo);
  const primaryDisabled =
    !isReady ||
    isBusy ||
    !isEmailValid ||
    !password ||
    (isRegistering && (!onboardingReady || !displayName.trim() || !canRegister));
  const registrationHint = !displayName.trim()
    ? vi.api.mobileAuthNeedName
    : !email.trim()
      ? vi.api.mobileAuthNeedEmail
      : !isEmailValid
        ? vi.api.mobileAuthEmailInvalid
        : strength !== 'passwordStrong'
          ? vi.api[strength]
          : profileIssue
            ? vi.api[profileIssue]
            : !registrationId
              ? vi.api.mobileAuthNeedCode
              : !REGISTRATION_CODE_PATTERN.test(code)
                ? vi.api.mobileAuthNeedFullCode
                : undefined;
  return (
    <Screen
      padded={false}
      background={x.day.surface}
      header={
        <View style={styles.header}>
          <Logo />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.common.back}
            disabled={isBusy}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            style={styles.back}
          >
            <Icon name="arrow-back" size={24} color={x.day.text} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.form}>
        <View style={styles.heading}>
          <Txt variant="title" style={styles.title}>
            {isRegistering
              ? vi.api.mobileAuthRegisterTitle
              : bookingContext
                ? vi.api.mobileAuthBookingTitle
                : vi.api.mobileAuthLoginTitle}
          </Txt>
          <Txt style={styles.body}>
            {isRegistering
              ? vi.api.mobileAuthRegisterBody
              : bookingContext
                ? vi.api.mobileAuthBookingBody
                : vi.api.mobileAuthLoginBody}
          </Txt>
        </View>
        {!isRegistering && !bookingContext && (
          <View style={[styles.photo, { height: height < 740 || fontScale > 1.2 ? 64 : 100 }]}>
            <Image
              source={assets.vietnam}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
            />
          </View>
        )}

        <Txt style={styles.helper}>{vi.api.mobileAuthRequiredLegend}</Txt>

        <View style={styles.group}>
          {isRegistering && (
            <Txt variant="heading" style={styles.groupTitle}>
              {vi.api.mobileAuthAccountGroup}
            </Txt>
          )}
          {isRegistering && (
            <Field
              label={vi.api.displayName}
              error={fieldError('displayName')}
              focusOnError={!!serverFieldError('displayName')}
              onBlur={() => touch('displayName')}
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                mutation.reset();
                requestCode.reset();
              }}
              editable={!isBusy}
              maxLength={DISPLAY_NAME_MAX}
            />
          )}
          <Field
            label={vi.api.email}
            error={fieldError('email')}
            focusOnError={!!serverFieldError('email')}
            onBlur={() => touch('email')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setCode('');
              setRegistrationId(undefined);
              requestCode.reset();
              cooldown.clear();
              mutation.reset();
            }}
            editable={!isBusy}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={254}
          />
          <View style={styles.passwordGroup}>
            <Field
              label={vi.api.password}
              error={fieldError('password')}
              focusOnError={!!serverFieldError('password')}
              onBlur={() => touch('password')}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                mutation.reset();
                requestCode.reset();
              }}
              editable={!isBusy}
              secureTextEntry={!passwordVisible}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              maxLength={isRegistering ? NEW_PASSWORD_MAX : CURRENT_PASSWORD_MAX}
              returnKeyType={isRegistering ? 'next' : 'done'}
              onSubmitEditing={() => {
                if (!isRegistering && !primaryDisabled) mutation.mutate();
              }}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? vi.api.hidePasswordLabel : vi.api.showPasswordLabel}
                  disabled={isBusy}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  style={styles.visibility}
                >
                  <Icon
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={x.day.text}
                  />
                </Pressable>
              }
            />
            {isRegistering && (
              <View style={styles.passwordHint}>
                {!!password && (
                  <Icon
                    name={
                      strength === 'passwordStrong'
                        ? 'checkmark-circle-outline'
                        : 'information-circle-outline'
                    }
                    size={17}
                    color={strength === 'passwordStrong' ? x.day.link : x.day.textSecondary}
                  />
                )}
                <Txt
                  style={[styles.helper, !!password && strength === 'passwordStrong' && styles.validPassword]}
                >
                  {password && strength === 'passwordStrong'
                    ? vi.api[strength]
                    : vi.api.mobileAuthPasswordHint}
                </Txt>
              </View>
            )}
          </View>
        </View>

        {isRegistering && (
          <>
            <View style={styles.group}>
              <Txt variant="heading" style={styles.groupTitle}>
                {vi.api.mobileAuthProfileGroup}
              </Txt>
              <Field
                label={vi.api.dateOfBirthTyped}
                error={fieldError('dateOfBirth')}
                focusOnError={!!serverFieldError('dateOfBirth')}
                onBlur={() => touch('dateOfBirth')}
                value={birthText}
                onChangeText={(value) => {
                  setBirthText(value.replace(/[^0-9/]/g, ''));
                  mutation.reset();
                  requestCode.reset();
                }}
                placeholder="20/05/2000"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!isBusy}
              />
              <View style={styles.fieldGroup}>
                <Txt style={styles.label}>{vi.api.gender} *</Txt>
                <View style={styles.chips}>
                  {SIGNUP_GENDERS.map((option) => (
                    <Chip
                      key={option}
                      selected={gender === option}
                      onPress={() => setGender(option)}
                      disabled={isBusy}
                      onBlur={() => touch('gender')}
                    >
                      {vi.api.genderOptions[option]}
                    </Chip>
                  ))}
                </View>
                {fieldError('gender') && (
                  <Txt accessibilityRole="alert" style={styles.localError}>
                    {fieldError('gender')}
                  </Txt>
                )}
              </View>
              <View style={styles.fieldGroup}>
                <Txt style={styles.label}>{vi.api.nationality} *</Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={vi.api.nationality + ': ' + describeNationality(nationality)}
                  accessibilityHint={vi.api.mobileAuthRequired}
                  accessibilityState={{ expanded: isNationalityOpen, disabled: isBusy }}
                  disabled={isBusy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setNationalityOpen(true);
                  }}
                  style={[authInputFrame, styles.select]}
                >
                  <Txt style={styles.selectLabel}>{describeNationality(nationality)}</Txt>
                  <Icon name="chevron-down" size={20} color={x.day.textSecondary} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityHint={vi.api.mobileAuthRequired}
                accessibilityState={{ checked: hasAcceptedTerms, disabled: isBusy }}
                aria-checked={hasAcceptedTerms}
                aria-required={true}
                disabled={isBusy}
                onPress={() => setAcceptedTerms(!hasAcceptedTerms)}
                onBlur={() => touch('terms')}
                style={styles.terms}
              >
                <Icon
                  name={hasAcceptedTerms ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={hasAcceptedTerms ? x.day.text : x.day.textSecondary}
                />
                <Txt style={styles.termsText}>
                  {vi.api.termsAgreePrefix}{' '}
                  <WebLinkText path="/dieu-khoan-su-dung">{vi.terms.title}</WebLinkText> {vi.api.termsAnd}{' '}
                  <WebLinkText path="/chinh-sach-bao-mat">{vi.privacy.title}</WebLinkText>
                  {vi.api.termsAgreeSuffix} *
                </Txt>
              </Pressable>
              {fieldError('terms') && (
                <Txt accessibilityRole="alert" style={styles.localError}>
                  {fieldError('terms')}
                </Txt>
              )}
            </View>
            <View style={styles.group}>
              <View style={styles.fieldGroup}>
                <Txt variant="heading" style={styles.groupTitle}>
                  {vi.api.mobileAuthVerifyGroup}
                </Txt>
                <Txt style={styles.helper}>{vi.api.mobileAuthVerifyHint}</Txt>
              </View>
              <Field
                label={vi.api.registrationCodeLabel}
                error={fieldError('code')}
                focusOnError={!!serverFieldError('code')}
                onBlur={() => touch('code')}
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/[^0-9]/g, ''));
                  mutation.reset();
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
                editable={!isBusy && !!registrationId}
              />
              <Button
                tone="secondary"
                disabled={!isReady || isBusy || cooldown.isWaiting || !canSendCode}
                onPress={() => {
                  mutation.reset();
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
              </Button>
              {!displayName.trim() && strength === 'passwordStrong' && !!email.trim() && (
                <Notice>{vi.api.registrationNeedsName}</Notice>
              )}
              {registrationId && <Notice>{vi.api.registrationCodeSent}</Notice>}
              {sendError && !hasInlineError ? (
                <Notice tone="error">{sendError}</Notice>
              ) : (
                <ApiErrorNotice error={hasInlineError ? undefined : requestCode.error} />
              )}
            </View>
          </>
        )}

        {formError && !hasInlineError ? (
          <Notice tone="error">{formError}</Notice>
        ) : mutation.error instanceof HttpError && mutation.error.status === 401 ? (
          <Notice tone="error">{vi.api.wrongCredentials}</Notice>
        ) : (
          <ApiErrorNotice error={hasInlineError ? undefined : mutation.error} />
        )}
        <View style={styles.actions}>
          {primaryDisabled && !isBusy && !mutation.error && (
            <Txt accessibilityLiveRegion="polite" style={styles.helper}>
              {isRegistering ? registrationHint : vi.api.mobileAuthLoginHint}
            </Txt>
          )}
          <Button
            icon="arrow-forward"
            disabled={primaryDisabled}
            busy={mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            {mutation.isPending ? vi.api.loggingIn : isRegistering ? vi.api.register : copy.auth.submit}
          </Button>
          <Button
            tone="text"
            disabled={isBusy}
            onPress={() => {
              setRegistering(!isRegistering);
              setTouched({});
              setPasswordVisible(false);
              mutation.reset();
              requestCode.reset();
              cooldown.clear();
              setCode('');
              setRegistrationId(undefined);
            }}
          >
            {isRegistering ? vi.api.haveAccount : vi.api.noAccount}
          </Button>
          {!isRegistering && <GoogleLoginButton disabled={isBusy} onLoggedIn={leaveAfterLogin} />}
        </View>
      </View>
      <Sheet
        title={vi.api.nationalityPick}
        visible={isNationalityOpen}
        onClose={() => setNationalityOpen(false)}
      >
        <View style={styles.chips}>
          {COMMON_NATIONALITIES.map((countryCode) => (
            <Chip
              key={countryCode}
              selected={nationality === countryCode}
              onPress={() => {
                setNationality(countryCode);
                setNationalityOpen(false);
              }}
            >
              {describeNationality(countryCode)}
            </Chip>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: mobileLayout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: mobileLayout.gutter, paddingTop: s.sm, paddingBottom: s.lg, gap: s.xl },
  heading: { gap: s.sm },
  title: { fontFamily: nativeFonts.bold, fontSize: 30, lineHeight: 41, letterSpacing: -1, color: x.day.text },
  body: { fontSize: 14, lineHeight: 23, color: x.day.textSecondary },
  photo: { overflow: 'hidden', borderRadius: 8, backgroundColor: x.day.tintExplore },
  group: { gap: s.lg },
  groupTitle: { color: x.day.text, fontSize: 19, lineHeight: 28, fontFamily: nativeFonts.semibold },
  fieldGroup: { gap: s.sm },
  label: { fontSize: 14, lineHeight: 22, fontFamily: nativeFonts.medium, color: x.day.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectLabel: { flex: 1, fontSize: 15, lineHeight: 24 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: s.sm, minHeight: 48, paddingVertical: s.xs },
  termsText: { flex: 1, fontSize: 13, lineHeight: 22, color: x.day.textSecondary },
  termsLink: { fontFamily: nativeFonts.semibold, fontSize: 13, lineHeight: 22, textDecorationLine: 'none' },
  passwordGroup: { gap: s.sm },
  passwordHint: { flexDirection: 'row', alignItems: 'flex-start', gap: s.sm },
  helper: { fontSize: 13, lineHeight: 22, color: x.day.textSecondary, flexShrink: 1 },
  localError: { fontSize: 13, lineHeight: 22, color: x.day.text },
  validPassword: { color: x.day.link },
  visibility: { width: 48, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  actions: { gap: s.md },
});
