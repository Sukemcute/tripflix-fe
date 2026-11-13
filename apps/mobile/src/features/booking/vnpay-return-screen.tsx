import { useQuery } from '@tanstack/react-query';
import { commerceApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Notice, Screen, Txt } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
import { PaymentSuccessScreen } from './payment-success';

export function VnpayReturnScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { isReady, user } = useApiSession();
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      key.startsWith('vnp_')
        ? (Array.isArray(value) ? value : [value]).map((entry) => [key, entry] as [string, string])
        : [],
    ),
  ).toString();
  const query = useQuery({
    queryKey: ['commerce', 'vnpay-return', queryString],
    enabled: isReady && !!queryString,
    retry: false,
    queryFn: () => commerceApi.confirmVnpay(queryString),
  });
  const order = useQuery({
    queryKey: ['commerce', 'order', user?.id, query.data?.orderId],
    enabled: isReady && !!user && !!query.data?.orderId,
    queryFn: ({ signal }) => commerceApi.getCheckout(query.data!.orderId!, signal),
    refetchInterval: (current) =>
      query.data?.isSuccess === true && ['pending', 'paying'].includes(current.state.data?.status ?? '')
        ? 3000
        : false,
  });
  const isSuccess = query.data?.isSuccess === true && order.data?.status === 'paid';
  if (isSuccess && !query.error && !order.error && order.data)
    return <PaymentSuccessScreen order={order.data} />;
  const isLoading =
    !isReady || (!!queryString && query.isPending) || (!!user && !!query.data?.orderId && order.isPending);
  const isAwaitingOrder =
    query.data?.isSuccess === true && !!order.data && ['pending', 'paying'].includes(order.data.status);
  return (
    <Screen title={vi.commerce.vnpay}>
      {isLoading && <Txt accessibilityLiveRegion="polite">{vi.commerce.verifyingPayment}</Txt>}
      {!queryString && <Notice tone="warning">{vi.commerce.missingPaymentReturn}</Notice>}
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      <CommerceError
        error={order.error}
        retry={() => {
          void order.refetch();
        }}
      />
      {isAwaitingOrder && <Notice>{vi.commerce.waiting}</Notice>}
      {!isLoading && !isAwaitingOrder && !!queryString && !query.error && query.data?.isSuccess === false && (
        <Notice tone="warning">{vi.commerce.vnpayFailed}</Notice>
      )}
      {isReady && !user && query.data?.orderId && (
        <>
          <Notice>{vi.commerce.loginToViewPayment}</Notice>
          <Button
            onPress={() =>
              router.push({
                pathname: '/login',
                params: { returnTo: `/payments/vnpay/return?${queryString}` },
              })
            }
          >
            {vi.api.login}
          </Button>
        </>
      )}
      {!!user && query.data?.orderId && (
        <Button
          onPress={() => router.replace({ pathname: '/booking/[id]', params: { id: query.data!.orderId! } })}
        >
          {vi.commerce.detail}
        </Button>
      )}
      <Button tone="text" onPress={() => router.replace('/my-trips')}>
        {vi.commerce.viewTrips}
      </Button>
    </Screen>
  );
}
