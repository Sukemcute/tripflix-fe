import { useEffect, useRef, useState, type ReactNode, type ComponentProps } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, createCancelVnpayOperation, HttpError, useApiSession } from '@tripflix/api-client';
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
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { RequireAccount } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import {
  Badge,
  Button,
  Card,
  copy,
  Field as BaseField,
  formatDate,
  Icon,
  type IconName,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { CommerceError, HoldTimer, useCommerceOrder } from './commerce-state';
import { useCommerce } from './commerce-provider';
import { CancelHold, CancelOrder, OrderCancelledScreen } from './order-cancel';
import { PaymentSuccessScreen } from './payment-success';
import { LoadingDots } from '@/components/loading-dots';

import { CheckoutSummary } from './checkout-summary';

const text = vi.commerce;
function Field(props: ComponentProps<typeof BaseField>) {
  return <BaseField {...props} style={[checkoutStyles.input, props.style]} />;
}
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
        <Button onPress={() => router.navigate('/(tabs)/explore')}>{text.findHotel}</Button>
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
        <Button onPress={() => router.navigate('/(tabs)/explore')}>{text.findHotel}</Button>
      </Screen>
    );
  return <CheckoutForm key={`${user.id}:${id}`} />;
}
function CheckoutForm() {
  const { user } = useApiSession();
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
  const [copiedContact, setCopiedContact] = useState(false);
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
  // Đơn đang chờ VNPay (không phải thẻ chờ OTP): form đã gửi, chỉ còn chờ kết quả hoặc tạo lần trả mới.
  const isPayingVnpay = order?.status === 'paying' && !challenge;
  const isExpired =
    order &&
    (['expired', 'cancelled'].includes(order.status) ||
      (order.status === 'pending' && holdCountdown(order.holdExpiresAt).expired));

  // Quay lại app khi lần trả VNPay chưa có kết quả (đóng tab, bấm back, chuyển app) thì coi như huỷ lần đó:
  // đơn về pending để trả lại hoặc huỷ giỏ. Trả xong thì VNPay chuyển về trang kết quả, không về đây.
  const [cancelVnpay] = useState(createCancelVnpayOperation);
  const hasCheckedOnOpen = useRef(false);
  const cancelPendingVnpay = useRef(async () => {});
  // Gán trong effect (không trong lúc render) để luôn đọc trạng thái đơn mới nhất khi app active lại.
  useEffect(() => {
    cancelPendingVnpay.current = async () => {
      if (order?.status !== 'paying' || challenge) return;
      try {
        const result = await cancelVnpay({ id, attempt: Date.now() });
        if (result.status !== 'pending') return;
        operations.paymentUrls.delete(id);
        operations.uncertain.delete(id);
        operations.retries.delete(id);
        setPaymentUrl('');
        setUnknown(false);
        setMessage(text.vnpayCancelled);
        await query.refetch();
      } catch {
        // Không huỷ được thì vẫn còn nút tạo lần VNPay mới; job hết hạn sẽ nhả đơn.
      }
    };
  });
  useEffect(() => {
    if (!order || hasCheckedOnOpen.current) return;
    hasCheckedOnOpen.current = true;
    void cancelPendingVnpay.current();
  }, [order]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void cancelPendingVnpay.current();
    });
    return () => subscription.remove();
  }, []);

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
        if (!['pending', 'paying'].includes(order.status)) return null;
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
      if (
        error instanceof HttpError &&
        error.status === 400 &&
        error.body &&
        typeof error.body === 'object' &&
        'errors' in error.body &&
        Array.isArray(error.body.errors)
      ) {
        const entries = error.body.errors.filter(
          (entry): entry is { field: string; message: string } =>
            !!entry &&
            typeof entry === 'object' &&
            typeof entry.field === 'string' &&
            typeof entry.message === 'string' &&
            (/^contact\.(fullName|phone|email)$/.test(entry.field) ||
              /^guests\[\d+\]\.(fullName|birthdate)$/.test(entry.field)),
        );
        setFieldErrors((previous) => ({
          ...previous,
          ...Object.fromEntries(entries.map((entry) => [entry.field, entry.message])),
        }));
      }
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
  const validateField = (field: string, guestPatch?: { index: number; birthdate: string }) => {
    if (!order) return;
    const passengers = Array.from({ length: order.passengersRequired }, (_, index) => ({
      fullName: guests[index]?.fullName ?? '',
      birthdate: guestPatch?.index === index ? guestPatch.birthdate : (guests[index]?.birthdate ?? ''),
    }));
    const errors = findCheckoutFieldErrors({
      contact: { fullName: name, phone, email },
      guests: passengers,
      passengerTypes: order.passengerTypes,
      travelDates: findTravelDates(order.items),
      stayDate: findStayDate(order.items),
      today,
    });
    setFieldErrors((previous) => {
      const next = { ...previous };
      if (errors[field]) next[field] = describeFieldError(field, errors[field]);
      else delete next[field];
      return next;
    });
  };
  const payTotal = order ? (acceptedTotal ?? order.total) : 0;
  const isPayDisabled =
    isLocked || !hasConsent || newTotal !== undefined || (method === 0 && !cardNumber.trim());
  return (
    <Screen
      title={text.checkout}
      background={colors.background}
      footer={
        canPay ? (
          <View style={checkoutStyles.footer}>
            <Row style={{ justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
              <Txt style={checkoutStyles.meta}>{text.checkoutPayable}</Txt>
              <Txt style={checkoutStyles.total}>{money(payTotal)}</Txt>
            </Row>
            {isPayDisabled && !isLocked && (
              <Txt style={checkoutStyles.meta}>
                {newTotal !== undefined
                  ? text.acceptPrice
                  : !hasConsent
                    ? text.checkoutConsentHint
                    : text.checkoutMethodHint}
              </Txt>
            )}
            <Button
              disabled={isPayDisabled}
              onPress={() => payment.mutate('pay')}
              style={[checkoutStyles.pay, isPayDisabled && checkoutStyles.disabledPay]}
            >
              {payment.isPending ? vi.api.loading : text.pay}
            </Button>
          </View>
        ) : undefined
      }
    >
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <LoadingDots />}
      {order && (
        <>
          {order.status === 'pending' && !isExpired && (
            <Row
              style={{
                gap: spacing.sm,
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: colors.coralTint,
              }}
            >
              <Icon name="time-outline" size={18} color={colors.coralInk} />
              <HoldTimer expiresAt={order.holdExpiresAt} />
            </Row>
          )}
          <CheckoutSummary order={order} total={canPay ? undefined : payTotal} />
          {isExpired ? (
            <>
              <Notice tone="error">{order.status === 'cancelled' ? text.holdCancelled : text.expired}</Notice>
              <Button onPress={() => router.navigate('/(tabs)/explore')}>{text.findHotel}</Button>
            </>
          ) : isPayingVnpay ? null : (
            <>
              <FormCard title={text.contact} icon="person-outline">
                <Txt style={checkoutStyles.meta}>{text.checkoutGuests.requiredHint}</Txt>
                <Button
                  tone="secondary"
                  style={checkoutStyles.copyButton}
                  disabled={isLocked || !!challenge}
                  onPress={() => {
                    setName((previous) => previous || user?.displayName || '');
                    setPhone((previous) => previous || user?.phone || '');
                    setEmail((previous) => previous || user?.email || '');
                    setFieldErrors((previous) => {
                      const next = { ...previous };
                      if (!name && user?.displayName) delete next['contact.fullName'];
                      if (!phone && user?.phone) delete next['contact.phone'];
                      if (!email && user?.email) delete next['contact.email'];
                      return next;
                    });
                  }}
                >
                  {text.checkoutGuests.useAccount}
                </Button>
                <Txt style={checkoutStyles.meta}>{text.checkoutGuests.accountHint}</Txt>
                <Field
                  label={text.checkoutGuests.contactName}
                  value={name}
                  editable={!isLocked && !challenge}
                  onChangeText={setName}
                  onBlur={() => validateField('contact.fullName')}
                  autoComplete="name"
                  error={fieldErrors['contact.fullName']}
                />
                <Field
                  label={text.checkoutGuests.contactPhone}
                  value={phone}
                  editable={!isLocked && !challenge}
                  onChangeText={setPhone}
                  onBlur={() => validateField('contact.phone')}
                  keyboardType="phone-pad"
                  error={fieldErrors['contact.phone']}
                  autoComplete="tel"
                />
                <Field
                  label={text.checkoutGuests.contactEmail}
                  value={email}
                  editable={!isLocked && !challenge}
                  onChangeText={setEmail}
                  onBlur={() => validateField('contact.email')}
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
                  <Txt style={checkoutStyles.meta}>{text.checkoutGuests.nameHint}</Txt>
                  {index === 0 && (
                    <View style={checkoutStyles.copyGroup}>
                      <Button
                        tone="secondary"
                        style={checkoutStyles.copyButton}
                        disabled={isLocked || !!challenge || !name.trim()}
                        onPress={() => {
                          editGuest(0, 'fullName', name.trim());
                          setCopiedContact(true);
                          setFieldErrors((previous) => {
                            const next = { ...previous };
                            delete next['guests[0].fullName'];
                            return next;
                          });
                        }}
                      >
                        {text.checkoutGuests.useContact}
                      </Button>
                      <Txt style={checkoutStyles.meta}>{text.checkoutGuests.copyHint}</Txt>
                      {copiedContact && (
                        <Txt accessibilityLiveRegion="polite" style={checkoutStyles.meta}>
                          {text.checkoutGuests.copied}
                        </Txt>
                      )}
                      <Button
                        tone="secondary"
                        style={checkoutStyles.copyButton}
                        disabled={isLocked || !!challenge}
                        onPress={() => {
                          setGuests((previous) => ({
                            ...previous,
                            0: {
                              fullName: previous[0]?.fullName || user?.displayName || '',
                              birthdate: previous[0]?.birthdate || user?.dateOfBirth?.slice(0, 10) || '',
                            },
                          }));
                          setFieldErrors((previous) => {
                            const next = { ...previous };
                            if (!guests[0]?.fullName && user?.displayName) delete next['guests[0].fullName'];
                            if (!guests[0]?.birthdate && user?.dateOfBirth)
                              delete next['guests[0].birthdate'];
                            return next;
                          });
                        }}
                      >
                        {text.checkoutGuests.usePassengerAccount}
                      </Button>
                      <Txt style={checkoutStyles.meta}>{text.checkoutGuests.passengerAccountHint}</Txt>
                    </View>
                  )}
                  <Field
                    label={t('commerce.checkoutGuests.passengerName', { number: index + 1 })}
                    value={guests[index]?.fullName ?? ''}
                    editable={!isLocked && !challenge}
                    onChangeText={(value) => editGuest(index, 'fullName', value)}
                    onBlur={() => validateField(`guests[${index}].fullName`)}
                    error={fieldErrors[`guests[${index}].fullName`]}
                  />
                  <DateSingleField
                    label={t('commerce.checkoutGuests.passengerBirthdate', { number: index + 1 })}
                    value={guests[index]?.birthdate ?? ''}
                    min="1900-01-01"
                    max={today}
                    isDisabled={isLocked || !!challenge}
                    onChange={(value) => {
                      editGuest(index, 'birthdate', value);
                      validateField(`guests[${index}].birthdate`, { index, birthdate: value });
                    }}
                    error={fieldErrors[`guests[${index}].birthdate`]}
                  />
                </FormCard>
              ))}
              {!challenge && (
                <FormCard title={text.paymentMethod} icon="card-outline">
                  {!isLocked && (
                    <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
                      {[text.card, text.vnpay].map((label, index) => (
                        <Pressable
                          key={label}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: method === index }}
                          onPress={() => setMethod(index)}
                          style={({ pressed }) => [
                            checkoutStyles.method,
                            method === index && checkoutStyles.selectedMethod,
                            pressed && ui.pressed,
                          ]}
                        >
                          <Txt
                            style={[
                              checkoutStyles.methodLabel,
                              method === index && checkoutStyles.selectedLabel,
                            ]}
                          >
                            {label}
                          </Txt>
                        </Pressable>
                      ))}
                    </Row>
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
                                borderRadius: radius.sm,
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
                  aria-checked={hasConsent}
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
                    style={checkoutStyles.pay}
                    disabled={payment.isPending || isUnknown || otp.length !== 6}
                    onPress={() => payment.mutate('otp')}
                  >
                    {text.confirmOtp}
                  </Button>
                </FormCard>
              )}
            </>
          )}
          {((order.status === 'paying' && !challenge) || operations.uncertain.has(id)) && (
            <Notice>{text.waiting}</Notice>
          )}
          {!!message && !(challenge && message === text.otpHint) && <Notice>{message}</Notice>}
          {(!!paymentUrl || isPayingVnpay) && (
            <>
              {!!paymentUrl && (
                <Button
                  tone="secondary"
                  onPress={() => {
                    void Linking.openURL(paymentUrl).catch(() => setMessage(text.reopenGateway));
                  }}
                >
                  {text.reopenGateway}
                </Button>
              )}
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
          {order.status === 'pending' && !isExpired && !payment.isPending && <CancelHold orderId={id} />}
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

/** Group fields without nesting another white card inside the checkout. */
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
    <View style={checkoutStyles.form}>
      <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Icon name={icon} size={22} color={colors.tealInk} />
        <View style={{ flex: 1 }}>
          <Txt accessibilityRole="header" style={checkoutStyles.formTitle}>
            {title}
          </Txt>
          {subtitle && <Txt style={checkoutStyles.meta}>{subtitle}</Txt>}
        </View>
      </Row>
      {children}
    </View>
  );
}

const checkoutStyles = StyleSheet.create({
  copyButton: { borderRadius: radius.sm, minHeight: 48, backgroundColor: colors.seaMist, borderWidth: 0 },
  copyGroup: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.sunSoft,
    borderRadius: radius.sm,
  },
  input: {
    borderRadius: radius.sm,
    minHeight: 52,
    fontSize: 16,
    lineHeight: 25,
    backgroundColor: colors.background,
  },
  footer: { gap: spacing.sm },
  total: { fontSize: 24, lineHeight: 34, fontFamily: nativeFonts.bold, color: colors.navy },
  meta: { fontSize: 13, lineHeight: 22, color: colors.ink },
  pay: { minHeight: 52, borderRadius: radius.sm, backgroundColor: colors.coralInk },
  disabledPay: { backgroundColor: colors.navy, opacity: 0.8 },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  formTitle: { fontSize: 22, lineHeight: 32, fontFamily: nativeFonts.semibold, color: colors.navy },
  method: {
    minHeight: 48,
    flexGrow: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  selectedMethod: { backgroundColor: colors.navy },
  methodLabel: { fontSize: 15, lineHeight: 24, color: colors.ink, fontFamily: nativeFonts.semibold },
  selectedLabel: { color: colors.background },
});

export function OrderSummary({ order }: { order: NonNullable<ReturnType<typeof useCommerceOrder>['data']> }) {
  return (
    <>
      <Txt variant="heading">
        {order.tripStatus === 'completed' ? text.tripCompleted : text.status[order.status]}
      </Txt>
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
      {query.isPending && <LoadingDots />}
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
      <Button onPress={() => router.replace('/my-trips')}>{text.viewTrips}</Button>
    </Screen>
  );
}
