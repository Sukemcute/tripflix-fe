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
  SIGNUP_GENDERS,
  type SignupGender,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, spacing as s } from '@tripflix/tokens';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  assets,
  Button,
  Chip,
  copy,
  Field,
  Icon,
  IconButton,
  Logo,
  Notice,
  Screen,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

const regionNames =
  typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['vi'], { type: 'region' }) : null;
const describeNationality = (code: string) => regionNames?.of(code) ?? code;
/** Địa chỉ web để mở Điều khoản, Chính sách từ app; chưa đặt thì chỉ hiện chữ. */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');

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
      style={[styles.termsLink, { color: c.coralInk }]}
      onPress={() => void Linking.openURL(`${WEB_URL}${path}`)}
    >
      {children}
    </Txt>
  );
}

export function LiveLoginScreen() {
  const { session, isReady } = useApiSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [isRegistering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [registrationId, setRegistrationId] = useState<string>();
  // Thông tin cá nhân và đồng ý điều khoản, bắt buộc khi đăng ký (TF06O).
  const [birthText, setBirthText] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('VN');
  const [hasAcceptedTerms, setAcceptedTerms] = useState(false);
  const [isNationalityOpen, setNationalityOpen] = useState(false);
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
  const canSendCode = hasAccountDetails && !profileIssue;
  const canRegister = canSendCode && !!registrationId && REGISTRATION_CODE_PATTERN.test(code);
  const mutation = useMutation({
    mutationFn: async () => {
      if (isRegistering)
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
      else await session.login({ email: email.trim(), password });
    },
    onSuccess: () => {
      setPassword('');
      const path =
        typeof returnTo === 'string' &&
        (/^\/(?:\(tabs\)|trip\/[^/?#]+|saved|create|cart|account-settings)(?:$|\/)/.test(returnTo) ||
          /^\/(?:flights|payments\/vnpay\/return)(?:\?|$)/.test(returnTo))
          ? returnTo
          : '/(tabs)/me';
      router.dismissTo(path as Href);
    },
  });
  const isBusy = mutation.isPending || requestCode.isPending;
  const registrationError = (error: unknown) => {
    const fieldError = getRegistrationFieldError(error);
    const kind = getAuthErrorKind(error, 'register');
    return fieldError ?? (kind ? vi.api[kind] : undefined);
  };
  const formError = isRegistering ? registrationError(mutation.error) : undefined;
  // 429 vì bấm quá sớm: nút đã đếm ngược, thay câu lỗi chung bằng số giây còn lại.
  const sendError =
    cooldown.isWaiting && getRetryAfterSeconds(requestCode.error) !== undefined
      ? t('api.registrationCodeTooSoon', { seconds: cooldown.secondsLeft })
      : registrationError(requestCode.error);
  return (
    <Screen header={null} padded={false}>
      <View style={styles.hero}>
        <Image source={assets.vietnam} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.scrim} />
        <View style={styles.heroHeader}>
          <View style={styles.logo}>
            <Logo />
          </View>
          <IconButton
            name="arrow-back"
            label={copy.common.back}
            light
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          />
        </View>
        <Txt variant="heading" style={styles.heroTitle}>
          {copy.auth.hero}
        </Txt>
      </View>
      <View style={styles.form}>
        <View style={{ gap: s.sm }}>
          <Txt variant="title">{isRegistering ? copy.auth.registerTitle : copy.auth.title}</Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.auth.body}
          </Txt>
        </View>
        {isRegistering && (
          <Field
            label={vi.api.displayName}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={DISPLAY_NAME_MAX}
          />
        )}
        <Field
          label={vi.api.email}
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
        <Field
          label={vi.api.password}
          value={password}
          onChangeText={setPassword}
          editable={!isBusy}
          secureTextEntry
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          maxLength={isRegistering ? NEW_PASSWORD_MAX : CURRENT_PASSWORD_MAX}
        />
        {isRegistering && (
          <>
            {!!password && (
              <Notice tone={strength === 'passwordStrong' ? 'info' : 'error'}>{vi.api[strength]}</Notice>
            )}
            <Field
              label={vi.api.dateOfBirthTyped}
              value={birthText}
              onChangeText={(value) => setBirthText(value.replace(/[^0-9/]/g, ''))}
              placeholder="20/05/2000"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              editable={!isBusy}
            />
            <View style={{ gap: s.sm }}>
              <Txt variant="label">{vi.api.gender}</Txt>
              <View style={styles.chips}>
                {SIGNUP_GENDERS.map((option) => (
                  <Chip key={option} selected={gender === option} onPress={() => setGender(option)}>
                    {vi.api.genderOptions[option]}
                  </Chip>
                ))}
              </View>
            </View>
            <View style={{ gap: s.sm }}>
              <Txt variant="label">{vi.api.nationality}</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${vi.api.nationality}: ${describeNationality(nationality)}`}
                onPress={() => setNationalityOpen(true)}
                style={[ui.input, styles.select]}
              >
                <Txt>{describeNationality(nationality)}</Txt>
                <Icon name="chevron-down" size={18} color={c.textMuted} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasAcceptedTerms }}
              onPress={() => setAcceptedTerms(!hasAcceptedTerms)}
              style={styles.terms}
            >
              <Icon
                name={hasAcceptedTerms ? 'checkbox' : 'square-outline'}
                size={22}
                color={hasAcceptedTerms ? c.coralInk : c.textMuted}
              />
              <Txt variant="small" style={[ui.muted, styles.termsText]}>
                {vi.api.termsAgreePrefix}{' '}
                <WebLinkText path="/dieu-khoan-su-dung">{vi.terms.title}</WebLinkText> {vi.api.termsAnd}{' '}
                <WebLinkText path="/chinh-sach-bao-mat">{vi.privacy.title}</WebLinkText>
                {vi.api.termsAgreeSuffix}
              </Txt>
            </Pressable>
            {!!profileIssue && hasAccountDetails && <Notice>{vi.api[profileIssue]}</Notice>}
            <Field
              label={vi.api.registrationCodeLabel}
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={8}
              editable={!isBusy && !!registrationId}
            />
            <Button
              tone="text"
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
            {sendError ? (
              <Notice tone="error">{sendError}</Notice>
            ) : (
              <ApiErrorNotice error={requestCode.error} />
            )}
          </>
        )}
        {formError ? (
          <Notice tone="error">{formError}</Notice>
        ) : mutation.error instanceof HttpError && mutation.error.status === 401 ? (
          <Notice tone="error">{vi.api.wrongCredentials}</Notice>
        ) : (
          <ApiErrorNotice error={mutation.error} />
        )}
        <Button
          icon="arrow-forward"
          disabled={
            !isReady ||
            isBusy ||
            !email.trim() ||
            !password ||
            (isRegistering && (!displayName.trim() || !canRegister))
          }
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? vi.api.loggingIn : isRegistering ? vi.api.register : copy.auth.submit}
        </Button>
        <Button
          tone="text"
          disabled={isBusy}
          onPress={() => {
            setRegistering(!isRegistering);
            mutation.reset();
            requestCode.reset();
            cooldown.clear();
            setCode('');
            setRegistrationId(undefined);
          }}
        >
          {isRegistering ? vi.api.haveAccount : vi.api.noAccount}
        </Button>
      </View>
      <Sheet
        title={vi.api.nationalityPick}
        visible={isNationalityOpen}
        onClose={() => setNationalityOpen(false)}
      >
        <View style={styles.chips}>
          {COMMON_NATIONALITIES.map((code) => (
            <Chip
              key={code}
              selected={nationality === code}
              onPress={() => {
                setNationality(code);
                setNationalityOpen(false);
              }}
            >
              {describeNationality(code)}
            </Chip>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 220,
    justifyContent: 'space-between',
    paddingHorizontal: s.xl,
    paddingTop: s.lg,
    paddingBottom: s.xl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: c.seaMist,
    gap: s.md,
  },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { backgroundColor: c.background, borderRadius: 12, paddingHorizontal: s.sm },
  heroTitle: { color: c.background, fontSize: 22, lineHeight: 30 },
  form: { paddingHorizontal: mobileLayout.gutter, gap: s.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: s.sm },
  termsText: { flex: 1 },
  termsLink: { fontWeight: '700' },
});
