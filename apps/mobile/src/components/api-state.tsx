import { getApiErrorKind, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { router } from 'expo-router';
import { Button, Notice, Screen, Txt } from './mobile-ui';

export function ApiErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <>
      <Notice tone="error">{vi.api[getApiErrorKind(error)]}</Notice>
      {retry && (
        <Button tone="secondary" onPress={retry}>
          {vi.api.retry}
        </Button>
      )}
    </>
  );
}
export function RequireAccount() {
  const { isReady, error, session } = useApiSession();
  return (
    <Screen title={vi.api.account}>
      {!isReady ? (
        <Txt>{vi.api.loading}</Txt>
      ) : (
        <>
          <ApiErrorNotice
            error={error}
            retry={() => {
              void session.initialize();
            }}
          />
          <Notice>{vi.api.loginRequired}</Notice>
          <Button onPress={() => router.push('/login')}>{vi.api.login}</Button>
        </>
      )}
    </Screen>
  );
}
export function UnavailableScreen({ message = vi.api.bookingUnavailable }: { message?: string }) {
  return (
    <Screen title={vi.app.name}>
      <Notice>{message}</Notice>
      <Button onPress={() => router.replace('/(tabs)/explore')}>{vi.api.search}</Button>
    </Screen>
  );
}
