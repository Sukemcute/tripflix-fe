import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, HttpError, useApiSession } from '@tripflix/api-client';
import { holdCountdown } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/components/api-state';
import { Notice, Txt } from '@/components/mobile-ui';

export function useRefreshOnOpen(refresh: () => unknown, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void refresh();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refresh();
      });
      return () => subscription.remove();
    }, [refresh, enabled]),
  );
}
export function useCommerceOrder(id: string) {
  const { user, isReady } = useApiSession();
  const [isFocused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const query = useQuery({
    queryKey: ['commerce', 'order', user?.id, id],
    enabled: isReady && !!user && !!id,
    queryFn: ({ signal }) => commerceApi.getCheckout(id, signal),
    refetchInterval: (query) =>
      isFocused && ['pending', 'paying'].includes(query.state.data?.status ?? '') ? 3000 : false,
  });
  useRefreshOnOpen(query.refetch, isReady && !!user && !!id);
  return query;
}
export function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const countdown = holdCountdown(expiresAt, now);
  const time = `${Math.floor(countdown.secondsLeft / 60)}:${String(countdown.secondsLeft % 60).padStart(2, '0')}`;
  return (
    <Txt accessibilityLiveRegion="polite">
      {countdown.expired ? vi.booking.holdExpired : t('booking.holdExpiresIn', { time })}
    </Txt>
  );
}
export function CommerceError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (error instanceof HttpError && error.body && typeof error.body === 'object' && 'message' in error.body) {
    const body = error.body as { message?: unknown; errors?: { field: string; message: string }[] };
    if (typeof body.message === 'string')
      return (
        <>
          <Notice tone="error">{body.message}</Notice>
          {Array.isArray(body.errors) &&
            body.errors.map((field, index) => (
              <Txt key={index}>
                {field.field}: {field.message}
              </Txt>
            ))}
          {retry && <ApiErrorNotice error={error} retry={retry} />}
        </>
      );
  }
  return <ApiErrorNotice error={error} retry={retry} />;
}
