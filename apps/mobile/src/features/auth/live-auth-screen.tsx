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
  getRegistrationPasswordStrength,
  REGISTRATION_CODE_PATTERN,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, spacing as s } from '@tripflix/tokens';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  assets,
  Button,
  copy,
  Field,
  IconButton,
  Logo,
  Notice,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

export function LiveLoginScreen() {
  const { session, isReady } = useApiSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [isRegistering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [registrationId, setRegistrationId] = useState<string>();
  const strength = getRegistrationPasswordStrength(password);
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
  const canSendCode = canSendRegistrationCode({ displayName, email, password });
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
            maxLength={50}
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
          maxLength={128}
        />
        {isRegistering && (
          <>
            <Notice tone={password && strength !== 'passwordStrong' ? 'error' : 'info'}>
              {password ? vi.api[strength] : vi.api.registerHint}
            </Notice>
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
});
