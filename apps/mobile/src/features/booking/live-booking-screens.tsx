import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, HttpError, useApiSession } from '@tripflix/api-client';
import type { PayResultDto } from '@tripflix/api-client/core-api/model/index';
import { holdCountdown, isValidTripDate } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { RequireAccount } from '@/components/api-state';
import {
  Badge,
  Button,
  Card,
  copy,
  Field,
  formatDate,
  money,
  Notice,
  PriceRow,
  Screen,
  Segments,
  Txt,
} from '@/components/mobile-ui';
import { CommerceError, HoldTimer, useCommerceOrder } from './commerce-state';
import { useCommerce } from './commerce-provider';
import { PaymentSuccessScreen } from './payment-success';

const text = vi.commerce;
function openOrder(id: string) {
  router.replace({ pathname: '/checkout', params: { id } });
}
export function CommerceCartScreen() {
  const { draft, operations } = useCommerce();
  const { user, isReady } = useApiSession();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Missing booking selection');
      return operations.create(draft.request);
    },
    retry: false,
    onSuccess: (order) => openOrder(order.orderId),
  });
  if (!draft)
    return (
      <Screen title={text.review}>
        <Notice>{text.emptyCart}</Notice>
        <Button onPress={() => router.push('/search')}>{text.findHotel}</Button>
      </Screen>
    );
  const item = draft.request.items[0]!;
  return (
    <Screen
      title={text.review}
      footer={
        <>
          <PriceRow total label={text.total} amount={money(draft.total)} />
          {!user ? (
            <Button
              icon="arrow-forward"
              onPress={() => router.push({ pathname: '/login', params: { returnTo: '/cart' } })}
            >
              {text.login}
            </Button>
          ) : (
            <Button
              icon="arrow-forward"
              disabled={!isReady || mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {mutation.isPending ? vi.api.loading : text.hold}
            </Button>
          )}
        </>
      }
    >
      <Txt variant="title">{draft.hotelName}</Txt>
      <Card>
        <Badge icon="bed-outline">{copy.hotel.title}</Badge>
        <Txt variant="heading">{draft.roomName}</Txt>
        <Txt>{draft.rateName}</Txt>
        <Txt>
          {formatDate(item.checkIn)}
          {item.checkOut && ` → ${formatDate(item.checkOut)}`}
        </Txt>
        <Txt>
          {item.qty} {vi.api.rooms} · {draft.request.adults} {text.guests}
        </Txt>
      </Card>
      <CommerceError error={mutation.error} />
    </Screen>
  );
}

export function CommerceCheckoutScreen() {
  const { user, isReady } = useApiSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isReady || !user) return <RequireAccount />;
  if (!id)
    return (
      <Screen title={text.checkout}>
        <Notice>{text.emptyCart}</Notice>
        <Button onPress={() => router.push('/search')}>{text.findHotel}</Button>
      </Screen>
    );
  return <CheckoutForm key={`${user.id}:${id}`} />;
}
function CheckoutForm() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const { operations } = useCommerce();
  const client = useQueryClient();
  const query = useCommerceOrder(id);
  const order = query.data;
  const cards = useQuery({
    queryKey: ['commerce', 'test-cards'],
    queryFn: ({ signal }) => commerceApi.listTestCards(signal),
    retry: false,
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState<Record<number, { fullName: string; birthdate: string }>>({});
  const [method, setMethod] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [hasConsent, setConsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState(operations.challenges.get(id));
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState('');
  const [newTotal, setNewTotal] = useState<number>();
  const [acceptedTotal, setAcceptedTotal] = useState<number>();
  const [paymentUrl, setPaymentUrl] = useState(operations.paymentUrls.get(id) ?? '');
  const [isUnknown, setUnknown] = useState(
    operations.uncertain.has(id) && !operations.pendingResults.has(id),
  );
  const retryPayment = useRef<
    (() => Promise<PayResultDto | { paymentUrl: string; expiresAt: string }>) | null
  >(operations.retries.get(id) ?? null);
  const isExpired =
    order &&
    (['expired', 'cancelled'].includes(order.status) ||
      (order.status === 'pending' && holdCountdown(order.holdExpiresAt).expired));

  useEffect(() => {
    if (order?.status === 'paid') {
      operations.uncertain.delete(id);
      operations.pendingResults.delete(id);
      void client.invalidateQueries({ queryKey: ['commerce', 'trips'] });
      router.replace({ pathname: '/success', params: { id } });
    }
  }, [order?.status, id, client, operations]);

  const payment = useMutation({
    retry: false,
    mutationFn: async (action: 'pay' | 'otp' | 'retry' | 'vnpayNew') => {
      if (!order) throw new Error('Missing checkout');
      setValidation('');
      if (action === 'retry') {
        const latest = await commerceApi.getCheckout(id);
        if (latest.status === 'paid' || ['cancelled', 'expired'].includes(latest.status)) {
          await query.refetch();
          return null;
        }
        if (!retryPayment.current) {
          await query.refetch();
          return null;
        }
        return retryPayment.current();
      }
      if (action === 'vnpayNew') {
        if (!paymentUrl || !['pending', 'paying'].includes(order.status)) return null;
        const input = {
          id,
          body: { expectedTotal: acceptedTotal ?? order.total, acceptedPolicyVersion: order.policyVersion },
          attempt: Date.now(),
        };
        retryPayment.current = () => operations.vnpay(input);
      } else if (action === 'otp') {
        if (!challenge) throw new Error('Missing challenge');
        const input = { id, challengeId: challenge, otp };
        retryPayment.current = () => operations.otp(input);
      } else {
        if (isExpired || order.status !== 'pending' || operations.uncertain.has(id)) return null;
        if (
          !name.trim() ||
          !/^0\d{9,10}$/.test(phone) ||
          (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        ) {
          setValidation(text.invalidContact);
          return null;
        }
        if (!hasConsent) {
          setValidation(text.policy);
          return null;
        }
        const passengers = Array.from(
          { length: order.passengersRequired },
          (_, index) => guests[index] ?? { fullName: '', birthdate: '' },
        );
        if (
          passengers.some(
            (guest) =>
              !guest.fullName.trim() ||
              !isValidTripDate(guest.birthdate, '1900-01-01') ||
              guest.birthdate > new Date().toISOString().slice(0, 10),
          )
        ) {
          setValidation(text.invalidGuests);
          return null;
        }
        await commerceApi.setGuests(id, {
          contact: { fullName: name.trim(), phone, email: email.trim() || null },
          guests: passengers,
        });
        const expectedTotal = acceptedTotal ?? order.total;
        const acceptedPolicyVersion = order.policyVersion;
        if (method === 0) {
          const input = {
            id,
            cardNumber: cardNumber.replace(/\s/g, ''),
            expectedTotal,
            acceptedPolicyVersion,
            attempt: operations.cardAttempts.get(id) ?? 0,
          };
          retryPayment.current = () => operations.pay(input);
        } else {
          const input = { id, body: { expectedTotal, acceptedPolicyVersion }, attempt: 0 };
          retryPayment.current = () => operations.vnpay(input);
        }
      }
      operations.uncertain.add(id);
      operations.retries.set(id, retryPayment.current!);
      return retryPayment.current!();
    },
    onSuccess: async (result) => {
      if (!result) return;
      operations.uncertain.delete(id);
      setUnknown(false);
      if ('paymentUrl' in result) {
        setPaymentUrl(result.paymentUrl);
        operations.paymentUrls.set(id, result.paymentUrl);
        setMessage(text.gatewayOpen);
        await Linking.openURL(result.paymentUrl);
      } else if (result.outcome === 'requires_action') {
        operations.challenges.set(id, result.challengeId!);
        setChallenge(result.challengeId);
        setMessage(text.otpHint);
      } else if (result.outcome === 'pending') {
        operations.uncertain.add(id);
        operations.pendingResults.add(id);
        setMessage(result.message ?? text.waiting);
      } else {
        operations.challenges.delete(id);
        setChallenge(undefined);
      }
      await query.refetch();
    },
    onError: (error) => {
      const isDefinitive = error instanceof HttpError && error.status < 500 && error.status !== 409;
      if (isDefinitive) operations.uncertain.delete(id);
      setUnknown(operations.uncertain.has(id));
      if (error instanceof HttpError && error.status === 402 && challenge) {
        operations.challenges.delete(id);
        operations.cardAttempts.set(id, (operations.cardAttempts.get(id) ?? 0) + 1);
        setChallenge(undefined);
        setMessage('');
      }
      if (
        error instanceof HttpError &&
        error.body &&
        typeof error.body === 'object' &&
        'reason' in error.body &&
        error.body.reason === 'PRICE_CHANGED' &&
        'newTotal' in error.body &&
        typeof error.body.newTotal === 'number'
      ) {
        setNewTotal(error.body.newTotal);
        setConsent(false);
        operations.uncertain.delete(id);
        setUnknown(false);
      }
      void query.refetch();
    },
  });
  const isLocked =
    payment.isPending ||
    (!!order && order.status !== 'pending') ||
    !!isExpired ||
    operations.uncertain.has(id) ||
    !!paymentUrl;
  const editGuest = (index: number, key: 'fullName' | 'birthdate', value: string) =>
    setGuests((previous) => ({
      ...previous,
      [index]: {
        fullName: previous[index]?.fullName ?? '',
        birthdate: previous[index]?.birthdate ?? '',
        [key]: value,
      },
    }));
  return (
    <Screen title={text.checkout}>
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {order && (
        <>
          <OrderSummary order={order} />
          {order.status === 'pending' && <HoldTimer expiresAt={order.holdExpiresAt} />}
          {isExpired ? (
            <>
              <Notice tone="error">{text.expired}</Notice>
              <Button onPress={() => router.push('/search')}>{text.findHotel}</Button>
            </>
          ) : (
            <>
              <Txt variant="heading">{text.contact}</Txt>
              <Field
                label={text.name}
                value={name}
                editable={!isLocked && !challenge}
                onChangeText={setName}
                autoComplete="name"
              />
              <Field
                label={text.phone}
                value={phone}
                editable={!isLocked && !challenge}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <Field
                label={text.email}
                value={email}
                editable={!isLocked && !challenge}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {Array.from({ length: order.passengersRequired }, (_, index) => (
                <Card key={index}>
                  <Txt>
                    {text.guest} {index + 1}
                  </Txt>
                  <Field
                    label={text.name}
                    value={guests[index]?.fullName ?? ''}
                    editable={!isLocked && !challenge}
                    onChangeText={(value) => editGuest(index, 'fullName', value)}
                  />
                  <Field
                    label={text.birthdate}
                    value={guests[index]?.birthdate ?? ''}
                    editable={!isLocked && !challenge}
                    onChangeText={(value) => editGuest(index, 'birthdate', value)}
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                  />
                </Card>
              ))}
              {!challenge && (
                <>
                  {!isLocked && (
                    <Segments options={[text.card, text.vnpay]} selected={method} onSelect={setMethod} />
                  )}
                  {method === 0 && (
                    <>
                      <Txt variant="heading">{text.testCards}</Txt>
                      <CommerceError
                        error={cards.error}
                        retry={() => {
                          void cards.refetch();
                        }}
                      />
                      {cards.data?.map((card) => (
                        <Button
                          key={card.number}
                          tone="secondary"
                          disabled={isLocked}
                          onPress={() => setCardNumber(card.number)}
                        >
                          {card.label} · {card.number}
                        </Button>
                      ))}
                      <Field
                        label={text.cardNumber}
                        value={cardNumber}
                        editable={!isLocked}
                        onChangeText={setCardNumber}
                        keyboardType="number-pad"
                      />
                    </>
                  )}
                  <Txt>
                    {text.policyVersion}: {order.policyVersion}
                  </Txt>
                  <Button tone="secondary" disabled={isLocked} onPress={() => setConsent(!hasConsent)}>
                    {hasConsent ? '☑ ' : '☐ '}
                    {text.policy}
                  </Button>
                  {newTotal !== undefined && (
                    <>
                      <Notice tone="warning">
                        {text.priceChanged} {money(newTotal)}
                      </Notice>
                      <Button
                        disabled={payment.isPending}
                        onPress={() => {
                          setAcceptedTotal(newTotal);
                          setNewTotal(undefined);
                        }}
                      >
                        {text.acceptPrice}
                      </Button>
                    </>
                  )}
                  <PriceRow total label={text.total} amount={money(acceptedTotal ?? order.total)} />
                  <Button
                    disabled={
                      isLocked ||
                      !hasConsent ||
                      newTotal !== undefined ||
                      (method === 0 && !cardNumber.trim())
                    }
                    onPress={() => payment.mutate('pay')}
                  >
                    {payment.isPending ? vi.api.loading : text.pay}
                  </Button>
                </>
              )}
              {challenge && (
                <>
                  <Notice>{text.otpHint}</Notice>
                  <Field
                    label={text.otp}
                    value={otp}
                    editable={!payment.isPending && !isUnknown}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    disabled={payment.isPending || isUnknown || otp.length !== 6}
                    onPress={() => payment.mutate('otp')}
                  >
                    {text.confirmOtp}
                  </Button>
                </>
              )}
            </>
          )}
          {(order.status === 'paying' || operations.uncertain.has(id)) && <Notice>{text.waiting}</Notice>}
          {!!message && <Notice>{message}</Notice>}
          {paymentUrl && (
            <>
              <Button
                tone="secondary"
                onPress={() => {
                  void Linking.openURL(paymentUrl).catch(() => setMessage(text.reopenGateway));
                }}
              >
                {text.reopenGateway}
              </Button>
              {['pending', 'paying'].includes(order.status) && (
                <Button
                  tone="secondary"
                  disabled={payment.isPending || isUnknown}
                  onPress={() => payment.mutate('vnpayNew')}
                >
                  {text.retryVnpay}
                </Button>
              )}
            </>
          )}
          {isUnknown && (
            <Button disabled={payment.isPending} onPress={() => payment.mutate('retry')}>
              {vi.api.retry}
            </Button>
          )}
          <CommerceError error={payment.error} />
          {validation && <Notice tone="error">{validation}</Notice>}
          <Button
            tone="text"
            onPress={() => {
              void query.refetch();
            }}
          >
            {text.checkStatus}
          </Button>
        </>
      )}
    </Screen>
  );
}
export function OrderSummary({ order }: { order: NonNullable<ReturnType<typeof useCommerceOrder>['data']> }) {
  return (
    <>
      <Txt variant="heading">{text.status[order.status]}</Txt>
      {order.items.map((item) => (
        <Card key={item.id}>
          <Txt variant="heading">{item.productName}</Txt>
          <Txt>
            {item.date} → {item.dateTo}
          </Txt>
          <Txt>
            {item.qty} × {item.ratePlanName}
          </Txt>
          <Txt>{item.isRefundable ? text.refundable : text.nonRefundable}</Txt>
          {item.freeCancelUntil && (
            <Txt>
              {text.freeCancel}: {item.freeCancelUntil}
            </Txt>
          )}
          <PriceRow label={text.total} amount={money(item.lineTotal)} />
        </Card>
      ))}
      <PriceRow total label={text.total} amount={money(order.total)} />
      {order.confirmationCode && <PriceRow label={text.confirmation} amount={order.confirmationCode} />}
      {order.cancelReason && <Notice tone="warning">{order.cancelReason}</Notice>}
    </>
  );
}
export function CommerceOrderScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const pathname = usePathname();
  const { user, isReady } = useApiSession();
  const query = useCommerceOrder(id);
  if (!isReady || !user) return <RequireAccount />;
  if (query.data?.status === 'paid' && pathname === '/success')
    return <PaymentSuccessScreen order={query.data} />;
  return (
    <Screen title={query.data?.status === 'paid' ? text.paid : text.detail}>
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {query.data && (
        <>
          <OrderSummary order={query.data} />
          {query.data.status === 'pending' && (
            <>
              <HoldTimer expiresAt={query.data.holdExpiresAt} />
              <Button onPress={() => openOrder(id)}>{text.checkout}</Button>
            </>
          )}
        </>
      )}
      <Button onPress={() => router.replace('/(tabs)/trips')}>{text.viewTrips}</Button>
    </Screen>
  );
}
