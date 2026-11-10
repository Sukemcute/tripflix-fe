import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, HttpError, useApiSession } from '@tripflix/api-client';
import type { PayResultDto } from '@tripflix/api-client/core-api/model/index';
import {
  findCheckoutFieldErrors,
  findStayDate,
  findTravelDates,
  holdCountdown,
  type GuestFieldError,
} from '@tripflix/app-core';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Pressable, View } from 'react-native';
import { RequireAccount } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import {
  Badge,
  Button,
  Card,
  copy,
  Field,
  formatDate,
  Icon,
  type IconName,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Segments,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { CommerceError, HoldTimer, useCommerceOrder } from './commerce-state';
import { useCommerce } from './commerce-provider';
import { CancelOrder, OrderCancelledScreen } from './order-cancel';
import { PaymentSuccessScreen } from './payment-success';

const text = vi.commerce;
const BIRTHDATE_MESSAGES: Partial<Record<GuestFieldError, MessageKey>> = {
  required: 'commerce.fieldErrors.birthdateRequired',
  futureDate: 'commerce.fieldErrors.birthdateFuture',
  adultAge: 'commerce.fieldErrors.adultAge',
  childAge: 'commerce.fieldErrors.childAge',
  infantAge: 'commerce.fieldErrors.infantAge',
  childRoomAge: 'commerce.fieldErrors.childRoomAge',
  infantRoomAge: 'commerce.fieldErrors.infantRoomAge',
};
/** Câu báo cho từng ô sai, giống web (khoá ô theo tên trường server: guests[0].birthdate). */
function describeFieldError(field: string, error: GuestFieldError): string {
  const errors = text.fieldErrors;
  if (field === 'contact.fullName') return errors.contactName;
  if (field === 'contact.phone')
    return error === 'required' ? errors.contactPhoneRequired : errors.contactPhone;
  if (field === 'contact.email') return errors.contactEmail;
  const number = Number(/^guests\[(\d+)\]/.exec(field)?.[1] ?? 0) + 1;
  if (field.endsWith('.fullName')) return t('commerce.fieldErrors.guestName', { number });
  return t(BIRTHDATE_MESSAGES[error] ?? 'commerce.fieldErrors.birthdateInvalid', { number });
}
const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
          {item.qty} {copy.booking.roomUnit} · {draft.request.adults} {text.guests}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [today] = useState(() => toLocalIsoDate(new Date()));
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
        const passengers = Array.from(
          { length: order.passengersRequired },
          (_, index) => guests[index] ?? { fullName: '', birthdate: '' },
        );
        const invalidFields = findCheckoutFieldErrors({
          contact: { fullName: name, phone, email },
          guests: passengers,
          passengerTypes: order.passengerTypes,
          travelDates: findTravelDates(order.items),
          stayDate: findStayDate(order.items),
          today: toLocalIsoDate(new Date()),
        });
        const messages = Object.fromEntries(
          Object.entries(invalidFields).map(([field, error]) => [field, describeFieldError(field, error)]),
        );
        setFieldErrors(messages);
        if (Object.keys(messages).length) {
          setValidation(t('commerce.invalidFields', { count: Object.keys(messages).length }));
          return null;
        }
        setValidation('');
        if (!hasConsent) {
          setValidation(text.policy);
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
  const canPay = !!order && !isExpired && !challenge && order.status === 'pending';
  const payTotal = order ? (acceptedTotal ?? order.total) : 0;
  const isPayDisabled =
    isLocked || !hasConsent || newTotal !== undefined || (method === 0 && !cardNumber.trim());
  return (
    <Screen
      title={text.checkout}
      background={colors.surface}
      footer={
        canPay ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
            <View>
              <Txt variant="small" style={ui.muted}>
                {text.total}
              </Txt>
              <Txt variant="heading" style={{ color: colors.coralInk }}>
                {money(payTotal)}
              </Txt>
            </View>
            <Button disabled={isPayDisabled} onPress={() => payment.mutate('pay')} style={{ flex: 1 }}>
              {payment.isPending ? vi.api.loading : text.pay}
            </Button>
          </Row>
        ) : undefined
      }
    >
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {order && (
        <>
          {order.status === 'pending' && !isExpired && (
            <Row
              style={{
                gap: spacing.sm,
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.coralTint,
              }}
            >
              <Icon name="time-outline" size={18} color={colors.coralInk} />
              <HoldTimer expiresAt={order.holdExpiresAt} />
            </Row>
          )}
          <CheckoutSummary order={order} total={payTotal} />
          {isExpired ? (
            <>
              <Notice tone="error">{text.expired}</Notice>
              <Button onPress={() => router.push('/search')}>{text.findHotel}</Button>
            </>
          ) : (
            <>
              <FormCard title={text.contact} icon="person-outline">
                <Field
                  label={text.name}
                  value={name}
                  editable={!isLocked && !challenge}
                  onChangeText={setName}
                  autoComplete="name"
                  error={fieldErrors['contact.fullName']}
                />
                <Field
                  label={text.phone}
                  value={phone}
                  editable={!isLocked && !challenge}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  error={fieldErrors['contact.phone']}
                  autoComplete="tel"
                />
                <Field
                  label={text.email}
                  value={email}
                  editable={!isLocked && !challenge}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  error={fieldErrors['contact.email']}
                  autoCapitalize="none"
                />
              </FormCard>
              {Array.from({ length: order.passengersRequired }, (_, index) => (
                <FormCard
                  key={index}
                  icon="people-outline"
                  title={`${text.guest} ${index + 1}`}
                  subtitle={
                    order.passengerTypes[index]
                      ? (findTravelDates(order.items) ? text.guestTypes : text.roomGuestTypes)[
                          order.passengerTypes[index]
                        ]
                      : undefined
                  }
                >
                  <Field
                    label={text.name}
                    value={guests[index]?.fullName ?? ''}
                    editable={!isLocked && !challenge}
                    onChangeText={(value) => editGuest(index, 'fullName', value)}
                    error={fieldErrors[`guests[${index}].fullName`]}
                  />
                  <DateSingleField
                    label={text.birthdate}
                    value={guests[index]?.birthdate ?? ''}
                    min="1900-01-01"
                    max={today}
                    isDisabled={isLocked || !!challenge}
                    onChange={(value) => editGuest(index, 'birthdate', value)}
                    error={fieldErrors[`guests[${index}].birthdate`]}
                  />
                </FormCard>
              ))}
              {!challenge && (
                <FormCard title={text.paymentMethod} icon="card-outline">
                  {!isLocked && (
                    <Segments options={[text.card, text.vnpay]} selected={method} onSelect={setMethod} />
                  )}
                  {method === 0 ? (
                    <>
                      <Txt variant="small" style={ui.muted}>
                        {text.testCards}
                      </Txt>
                      <CommerceError
                        error={cards.error}
                        retry={() => {
                          void cards.refetch();
                        }}
                      />
                      {/* Thẻ kiểm thử là các chip nhỏ, chạm để điền số thẻ. */}
                      <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
                        {cards.data?.map((card) => {
                          const isActive = cardNumber === card.number;
                          return (
                            <Pressable
                              key={card.number}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isActive }}
                              disabled={isLocked}
                              onPress={() => setCardNumber(card.number)}
                              style={{
                                paddingHorizontal: spacing.md,
                                paddingVertical: spacing.sm,
                                borderRadius: radius.pill,
                                borderWidth: 1,
                                borderColor: isActive ? colors.tealInk : colors.border,
                                backgroundColor: isActive ? colors.seaMist : colors.background,
                              }}
                            >
                              <Txt variant="small" style={{ fontWeight: '600', color: colors.ink }}>
                                {card.label}
                              </Txt>
                              <Txt variant="small" style={[ui.muted, { fontSize: 11 }]}>
                                •••• {card.number.slice(-4)}
                              </Txt>
                            </Pressable>
                          );
                        })}
                      </Row>
                      <Field
                        label={text.cardNumber}
                        value={cardNumber}
                        editable={!isLocked}
                        onChangeText={setCardNumber}
                        keyboardType="number-pad"
                      />
                    </>
                  ) : (
                    <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                      <Icon name="open-outline" size={18} color={colors.tealInk} />
                      <Txt variant="small" style={[ui.muted, { flex: 1 }]}>
                        {text.vnpayHint}
                      </Txt>
                    </Row>
                  )}
                </FormCard>
              )}
              {!challenge && (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasConsent, disabled: isLocked }}
                  disabled={isLocked}
                  onPress={() => setConsent(!hasConsent)}
                  style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      marginTop: 1,
                      borderRadius: 6,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: hasConsent ? colors.coral : colors.textSubtle,
                      backgroundColor: hasConsent ? colors.coral : colors.background,
                    }}
                  >
                    {hasConsent && <Icon name="checkmark" size={15} color={colors.background} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="small">{text.policy}</Txt>
                    <Txt variant="small" style={[ui.muted, { fontSize: 11 }]}>
                      {text.policyVersion}: {order.policyVersion}
                    </Txt>
                  </View>
                </Pressable>
              )}
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
              {challenge && (
                <FormCard title={text.otp} icon="key-outline">
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
                </FormCard>
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
          {order.status !== 'pending' && (
            <Button
              tone="text"
              onPress={() => {
                void query.refetch();
              }}
            >
              {text.checkStatus}
            </Button>
          )}
        </>
      )}
    </Screen>
  );
}

/** Thẻ trắng có tiêu đề + biểu tượng, gom từng phần của màn thanh toán cho gọn. */
function FormCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View
      style={{ padding: spacing.md, gap: spacing.md, borderRadius: 20, backgroundColor: colors.background }}
    >
      <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.seaMist,
          }}
        >
          <Icon name={icon} size={16} color={colors.tealInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="label">{title}</Txt>
          {subtitle && (
            <Txt variant="small" style={ui.muted}>
              {subtitle}
            </Txt>
          )}
        </View>
      </Row>
      {children}
    </View>
  );
}

/** Tóm tắt đơn gọn: mỗi mục một khối, tổng tiền chỉ một lần. */
function CheckoutSummary({
  order,
  total,
}: {
  order: NonNullable<ReturnType<typeof useCommerceOrder>['data']>;
  total: number;
}) {
  return (
    <View
      style={{ padding: spacing.md, gap: spacing.md, borderRadius: 20, backgroundColor: colors.background }}
    >
      {order.items.map((item) => (
        <View key={item.id} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
            <Txt variant="label" style={{ flex: 1 }}>
              {item.productName}
            </Txt>
            <Txt variant="label">{money(item.lineTotal)}</Txt>
          </Row>
          <Row style={{ gap: 6 }}>
            <Icon name="calendar-outline" size={14} color={colors.textMuted} />
            <Txt variant="small" style={ui.muted}>
              {item.productType === 'flight'
                ? formatDate(item.date)
                : `${formatDate(item.date)} → ${formatDate(item.dateTo)}`}
            </Txt>
          </Row>
          <Txt variant="small" style={ui.muted}>
            {item.qty} × {item.ratePlanName}
          </Txt>
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 2,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radius.pill,
              backgroundColor: item.isRefundable ? colors.seaMist : colors.surfaceMuted,
            }}
          >
            <Txt variant="small" style={{ color: item.isRefundable ? colors.tealInk : colors.textMuted }}>
              {item.isRefundable && item.freeCancelUntil
                ? `${text.freeCancel}: ${formatDate(item.freeCancelUntil.slice(0, 10))}`
                : item.isRefundable
                  ? text.refundable
                  : text.nonRefundable}
            </Txt>
          </View>
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderStyle: 'dashed',
          borderTopColor: colors.border,
        }}
      >
        <Txt variant="label">{text.total}</Txt>
        <Txt variant="heading" style={{ color: colors.coralInk }}>
          {money(total)}
        </Txt>
      </View>
    </View>
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
            {item.productType === 'flight'
              ? vi.flights.date + ' · ' + formatDate(item.date)
              : formatDate(item.date) + ' → ' + formatDate(item.dateTo)}
          </Txt>
          <Txt>
            {item.qty} × {item.ratePlanName}
          </Txt>
          <Txt>{item.isRefundable ? text.refundable : text.nonRefundable}</Txt>
          {item.freeCancelUntil && (
            <Txt>
              {text.freeCancel}: {formatDate(item.freeCancelUntil.slice(0, 10))}
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
  // Đơn đã trả tiền rồi huỷ có mã xác nhận; đơn hết hạn khi chưa trả thì không.
  if (query.data?.status === 'cancelled' && query.data.confirmationCode)
    return <OrderCancelledScreen order={query.data} />;
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
          {query.data.status === 'paid' && <CancelOrder orderId={query.data.orderId} />}
        </>
      )}
      <Button onPress={() => router.replace('/(tabs)/trips')}>{text.viewTrips}</Button>
    </Screen>
  );
}
