import { useCallback, useEffect, useState } from 'react';
import { AppState, type StyleProp, type TextStyle } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, HttpError, useApiSession } from '@tripflix/api-client';
import { holdCountdown } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/components/api-state';
import { Button, Notice, Txt } from '@/components/mobile-ui';

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
export function HoldTimer({ expiresAt, style }: { expiresAt: string; style?: StyleProp<TextStyle> }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const countdown = holdCountdown(expiresAt, now);
  const time = `${Math.floor(countdown.secondsLeft / 60)}:${String(countdown.secondsLeft % 60).padStart(2, '0')}`;
  return (
    <Txt accessibilityLiveRegion="polite" style={style}>
      {countdown.expired ? vi.booking.holdExpired : t('booking.holdExpiresIn', { time })}
    </Txt>
  );
}
export function CommerceError({ error, retry }: { error: unknown; retry?: () => void }) {
  // 4xx và 503 có câu tiếng Việt từ backend; 500 mặc định của Nest là tiếng Anh nên dùng thông báo chung.
  if (
    error instanceof HttpError &&
    (error.status < 500 || error.status === 503) &&
    error.body &&
    typeof error.body === 'object' &&
    'message' in error.body
  ) {
    const body = error.body as { message?: unknown; errors?: { field: string; message: string }[] };
    if (typeof body.message === 'string')
      return (
        <>
          <Notice tone="error">{body.message}</Notice>
          {Array.isArray(body.errors) &&
            // Lỗi 409 lặp lại đúng câu chính trong errors; bỏ để không hiện hai lần.
            body.errors
              .filter((field) => field.message !== body.message)
              .map((field, index) => (
                <Txt key={index}>
                  {field.field}: {field.message}
                </Txt>
              ))}
          {error.status === 409 && <PendingPaymentLink />}
          {retry && <ApiErrorNotice error={error} retry={retry} />}
        </>
      );
  }
  return <ApiErrorNotice error={error} retry={retry} />;
}

/**
 * 409 khi giữ giỏ thường là do còn đơn đang chờ cổng thanh toán (ví dụ rời trang VNPay giữa chừng).
 * Tìm đơn đó trong Chuyến đi của tôi và cho mở lại để thanh toán tiếp, thay vì bắt người dùng chờ hết giờ giữ chỗ.
 */
function PendingPaymentLink() {
  const query = useQuery({
    queryKey: ['commerce', 'trips', 'paying'],
    queryFn: ({ signal }) => commerceApi.listTrips(undefined, signal),
    select: (page) => page.trips.find((trip) => trip.status === 'paying'),
    staleTime: 0,
  });
  const trip = query.data;
  if (!trip) return null;
  return (
    <>
      <Notice>{vi.commerce.pendingPayment}</Notice>
      <Button
        tone="secondary"
        onPress={() => router.push({ pathname: '/checkout', params: { id: trip.orderId } })}
      >
        {vi.commerce.openPendingPayment}
      </Button>
    </>
  );
}
