import { HttpError, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Mascot, Notice, Screen, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

export function LiveLoginScreen() {
  const { session, isReady } = useApiSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [isRegistering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const mutation = useMutation({
    mutationFn: async () => {
      if (isRegistering)
        await session.register({ email: email.trim(), password, displayName: displayName.trim() });
      else await session.login({ email: email.trim(), password });
    },
    onSuccess: () => {
      setPassword('');
      const path =
        typeof returnTo === 'string' &&
        (/^\/(?:\(tabs\)|trip\/[^/?#]+|saved|create|cart)(?:$|\/)/.test(returnTo) ||
          /^\/payments\/vnpay\/return(?:\?|$)/.test(returnTo))
          ? returnTo
          : '/(tabs)/me';
      router.replace(path as Href);
    },
  });
  return (
    <Screen title={isRegistering ? vi.api.register : vi.api.login}>
      <Mascot pose="welcome" />
      <Txt variant="title">{vi.api.loginBody}</Txt>
      {isRegistering && (
        <Field label={vi.api.displayName} value={displayName} onChangeText={setDisplayName} maxLength={50} />
      )}
      <Field
        label={vi.api.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        maxLength={254}
      />
      <Field
        label={vi.api.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isRegistering ? 'new-password' : 'current-password'}
        maxLength={128}
      />
      {isRegistering && <Notice>{vi.api.registerHint}</Notice>}
      {mutation.error instanceof HttpError && mutation.error.status === 401 ? (
        <Notice tone="error">{vi.api.wrongCredentials}</Notice>
      ) : (
        <ApiErrorNotice error={mutation.error} />
      )}
      <Button
        disabled={
          !isReady ||
          mutation.isPending ||
          !email.trim() ||
          !password ||
          (isRegistering && !displayName.trim())
        }
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? vi.api.loggingIn : isRegistering ? vi.api.register : vi.api.login}
      </Button>
      <Button
        tone="text"
        disabled={mutation.isPending}
        onPress={() => {
          setRegistering(!isRegistering);
          mutation.reset();
        }}
      >
        {isRegistering ? vi.api.haveAccount : vi.api.noAccount}
      </Button>
    </Screen>
  );
}
