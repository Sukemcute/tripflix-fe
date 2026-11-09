'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  commerceApi,
  createCardPaymentOperation,
  createOtpOperation,
  createVnpayOperation,
  HttpError,
  useApiSession,
} from '@tripflix/api-client';
import {
  findCheckoutFieldErrors,
  findStayDate,
  findTravelDates,
  holdCountdown,
  type GuestFieldError,
} from '@tripflix/app-core';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/discovery/trip-card';
import { formatPassengerMix } from '@/features/flights/passenger-picker';
import { SoftDatePicker } from '@/features/shared/soft-date-picker';
import { CheckoutError } from './checkout-error';
import { CheckoutIcon, type CheckoutIconName } from './checkout-icon';
import styles from './checkout-form.module.css';

const copy = vi.commerce;
type Order = Awaited<ReturnType<typeof commerceApi.getCheckout>>;
type Method = 'card' | 'vnpay';
type GuestDraft = { fullName: string; birthdate: string };

const formatDate = (date: string) => date.split('-').reverse().join('/');
const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const BIRTHDATE_MESSAGES: Partial<Record<GuestFieldError, MessageKey>> = {
  required: 'commerce.fieldErrors.birthdateRequired',
  futureDate: 'commerce.fieldErrors.birthdateFuture',
  adultAge: 'commerce.fieldErrors.adultAge',
  childAge: 'commerce.fieldErrors.childAge',
  infantAge: 'commerce.fieldErrors.infantAge',
  childRoomAge: 'commerce.fieldErrors.childRoomAge',
  infantRoomAge: 'commerce.fieldErrors.infantRoomAge',
};

/** Câu báo cho một ô sai; khoá ô giống tên trường server trả về (contact.phone, guests[0].birthdate). */
function describeFieldError(field: string, error: GuestFieldError): string {
  const errors = copy.fieldErrors;
  if (field === 'contact.fullName') return errors.contactName;
  if (field === 'contact.phone') return error === 'required' ? errors.contactPhoneRequired : errors.contactPhone;
  if (field === 'contact.email') return errors.contactEmail;
  const number = Number(/^guests\[(\d+)\]/.exec(field)?.[1] ?? 0) + 1;
  if (field.endsWith('.fullName')) return t('commerce.fieldErrors.guestName', { number });
  return t(BIRTHDATE_MESSAGES[error] ?? 'commerce.fieldErrors.birthdateInvalid', { number });
}

/** Lỗi 400 của server kèm danh sách trường sai: { errors: [{ field, message }] }. */
function readServerFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpError) || error.status !== 400) return {};
  const body = error.body;
  if (!body || typeof body !== 'object' || !('errors' in body) || !Array.isArray(body.errors)) return {};
  const fieldErrors: Record<string, string> = {};
  for (const entry of body.errors as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const { field, message } = entry as { field?: unknown; message?: unknown };
    if (typeof field === 'string' && typeof message === 'string') fieldErrors[field] = message;
  }
  return fieldErrors;
}

export function CheckoutScreen({ id }: { id: string }) {
  const { user, isReady } = useApiSession();
  if (isReady && !user)
    return (
      <main className={`ota-container ${styles.page}`}>
        <div className={styles.card}>
          <p>{copy.loginToViewPayment}</p>
          <Link className="primary-button" href={`/login?returnTo=${encodeURIComponent(`/checkout/${id}`)}`}>
            {vi.commerce.login}
          </Link>
        </div>
      </main>
    );
  return <CheckoutForm key={`${user?.id}:${id}`} id={id} isEnabled={isReady && !!user} />;
}

function useOrder(id: string, isEnabled: boolean) {
  return useQuery({
    queryKey: ['commerce', 'order', id],
    enabled: isEnabled,
    queryFn: ({ signal }) => commerceApi.getCheckout(id, signal),
    // Đơn đang chờ cổng trả kết quả thì hỏi lại định kỳ.
    refetchInterval: (query) => (query.state.data?.status === 'paying' ? 3000 : false),
  });
}

function CheckoutForm({ id, isEnabled }: { id: string; isEnabled: boolean }) {
  const client = useQueryClient();
  const query = useOrder(id, isEnabled);
  const order = query.data;
  const cards = useQuery({
    queryKey: ['commerce', 'test-cards'],
    enabled: isEnabled,
    queryFn: ({ signal }) => commerceApi.listTestCards(signal),
    retry: false,
  });
  const [operations] = useState(() => ({
    card: createCardPaymentOperation(),
    otp: createOtpOperation(),
    vnpay: createVnpayOperation(),
  }));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState<Record<number, GuestDraft>>({});
  const [method, setMethod] = useState<Method>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [hasConsent, setConsent] = useState(false);
  const [challengeId, setChallengeId] = useState<string>();
  const [otp, setOtp] = useState('');
  const [validation, setValidation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Tăng mỗi lần có ô sai, để cuộn tới ô sai đầu tiên sau khi form mở khoá lại.
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState('');
  const [newTotal, setNewTotal] = useState<number>();
  const [acceptedTotal, setAcceptedTotal] = useState<number>();
  const [cardAttempt, setCardAttempt] = useState(0);

  useEffect(() => {
    if (order?.status === 'paid') void client.invalidateQueries({ queryKey: ['commerce', 'trips'] });
  }, [order?.status, client]);

  const payment = useMutation({
    retry: false,
    mutationFn: async (action: 'pay' | 'otp') => {
      if (!order) throw new Error('Missing checkout');
      setValidation('');
      if (action === 'otp') {
        if (!challengeId) throw new Error('Missing challenge');
        return operations.otp({ id, challengeId, otp });
      }
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
        setFocusRequest((request) => request + 1);
        return null;
      }
      if (!hasConsent) {
        setValidation(copy.policy);
        return null;
      }
      await commerceApi.setGuests(id, {
        contact: { fullName: name.trim(), phone, email: email.trim() || null },
        guests: passengers,
      });
      const expectedTotal = acceptedTotal ?? order.total;
      if (method === 'vnpay')
        return operations.vnpay({
          id,
          body: { expectedTotal, acceptedPolicyVersion: order.policyVersion },
          attempt: 0,
        });
      return operations.card({
        id,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expectedTotal,
        acceptedPolicyVersion: order.policyVersion,
        attempt: cardAttempt,
      });
    },
    onSuccess: async (result) => {
      if (!result) return;
      if ('paymentUrl' in result) {
        setMessage(copy.gatewayOpen);
        window.location.assign(result.paymentUrl);
        return;
      }
      if (result.outcome === 'requires_action') {
        setChallengeId(result.challengeId);
        setMessage(copy.otpHint);
      } else if (result.outcome === 'pending') {
        setMessage(result.message ?? copy.waiting);
      } else {
        setChallengeId(undefined);
        setMessage('');
      }
      await query.refetch();
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 402) {
        // Thẻ bị từ chối: lần sau là một thao tác mới, cần key mới.
        setCardAttempt((attempt) => attempt + 1);
        setChallengeId(undefined);
        setOtp('');
        setMessage('');
      }
      const serverFieldErrors = readServerFieldErrors(error);
      if (Object.keys(serverFieldErrors).length) {
        setFieldErrors(serverFieldErrors);
        setFocusRequest((request) => request + 1);
      }
      const body = error instanceof HttpError ? error.body : undefined;
      if (
        body &&
        typeof body === 'object' &&
        'reason' in body &&
        body.reason === 'PRICE_CHANGED' &&
        'newTotal' in body &&
        typeof body.newTotal === 'number'
      ) {
        setNewTotal(body.newTotal);
        setConsent(false);
      }
      void query.refetch();
    },
  });

  // Ô bị khoá (disabled) không nhận focus: đợi gửi xong rồi mới cuộn tới ô sai đầu tiên.
  useEffect(() => {
    if (!focusRequest || payment.isPending) return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    firstInvalid?.focus({ preventScroll: true });
  }, [focusRequest, payment.isPending]);

  if (query.isPending && isEnabled)
    return (
      <main className={`ota-container ${styles.page}`}>
        <p>{vi.api.loading}</p>
      </main>
    );
  if (!order)
    return (
      <main className={`ota-container ${styles.page}`}>
        <CheckoutError error={query.error} retry={() => void query.refetch()} />
      </main>
    );
  if (order.status === 'paid') return <PaymentSuccess order={order} />;

  const isExpired =
    ['expired', 'cancelled'].includes(order.status) ||
    (order.status === 'pending' && holdCountdown(order.holdExpiresAt).expired);
  const isLocked = payment.isPending || order.status !== 'pending' || isExpired || !!challengeId;
  const total = acceptedTotal ?? order.total;
  const flightItem = order.items.find((item) => item.productType === 'flight');
  // Trang để quay lại khi không có lịch sử trong trang (mở thẳng link): vé bay về trang chuyến, phòng về tìm khách sạn.
  const productHref = flightItem
    ? `/flights/${encodeURIComponent(flightItem.productId)}?${new URLSearchParams({
        date: flightItem.date,
        passengers: String(order.adults),
        ...(order.children ? { children: String(order.children) } : {}),
        ...(order.infants ? { infants: String(order.infants) } : {}),
      })}`
    : '/search';
  // Người dùng sửa ô nào thì bỏ lỗi của ô đó, lần bấm thanh toán sau kiểm lại.
  const clearFieldError = (field: string) =>
    setFieldErrors((previous) => {
      if (!(field in previous)) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  const editContact = (field: string, setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    clearFieldError(field);
  };
  const editGuest = (index: number, key: keyof GuestDraft, value: string) => {
    setGuests((previous) => ({
      ...previous,
      [index]: { fullName: '', birthdate: '', ...previous[index], [key]: value },
    }));
    clearFieldError(`guests[${index}].${key}`);
  };
  const fieldErrorCount = Object.keys(fieldErrors).length;
  // Lỗi "thiếu hành khách" không gắn với ô nào nên hiện ở câu tổng.
  const fieldSummary = fieldErrors.guests ?? t('commerce.invalidFields', { count: fieldErrorCount });

  return (
    <main className={`ota-container ${styles.page}`}>
      <BackLink fallbackHref={productHref} label={flightItem ? copy.backToFlight : copy.backToHotel} />
      <Steps current={2} />
      <header className={styles.header}>
        <h1 className={styles.title}>{copy.checkout}</h1>
        <p className={styles.intro}>{copy.checkoutIntro}</p>
      </header>
      <div className={styles.layout}>
        <section className={styles.main}>
          {isExpired ? (
            <div className={styles.card}>
              <p role="alert" className={styles.error}>
                {flightItem ? copy.expiredFlight : copy.expired}
              </p>
              <Link className="primary-button" href={productHref}>
                {flightItem ? copy.findFlight : copy.findHotel}
              </Link>
            </div>
          ) : (
            <form
              ref={formRef}
              noValidate
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                payment.mutate(challengeId ? 'otp' : 'pay');
              }}
            >
              <fieldset className={styles.card} disabled={isLocked}>
                <legend className={styles.cardTitle}>
                  <span className={styles.cardIcon}>
                    <CheckoutIcon name="user" />
                  </span>
                  <span>
                    {copy.contact}
                    <small>{copy.contactHint}</small>
                  </span>
                </legend>
                <div className={styles.fields}>
                  <Field
                    label={copy.name}
                    value={name}
                    onChange={editContact('contact.fullName', setName)}
                    error={fieldErrors['contact.fullName']}
                    autoComplete="name"
                    wide
                  />
                  <Field
                    label={copy.phone}
                    value={phone}
                    onChange={editContact('contact.phone', setPhone)}
                    error={fieldErrors['contact.phone']}
                    autoComplete="tel"
                    type="tel"
                  />
                  <Field
                    label={copy.email}
                    value={email}
                    onChange={editContact('contact.email', setEmail)}
                    error={fieldErrors['contact.email']}
                    autoComplete="email"
                    type="email"
                  />
                </div>
                <p className={styles.guestsNote}>
                  <CheckoutIcon name="users" size={18} />
                  {copy.guestsHint}
                </p>
                {Array.from({ length: order.passengersRequired }, (_, index) => (
                  <div key={index} className={`${styles.fields} ${styles.guest}`}>
                    <p className={styles.subTitle}>
                      <span className={styles.guestNumber}>{index + 1}</span>
                      {copy.guest} {index + 1}
                      {order.passengerTypes[index] && (
                        <span className={styles.guestType}>
                          {(findTravelDates(order.items) ? copy.guestTypes : copy.roomGuestTypes)[order.passengerTypes[index]]}
                        </span>
                      )}
                    </p>
                    <Field
                      label={copy.name}
                      value={guests[index]?.fullName ?? ''}
                      onChange={(value) => editGuest(index, 'fullName', value)}
                      error={fieldErrors[`guests[${index}].fullName`]}
                    />
                    <Field
                      label={copy.birthdate}
                      value={guests[index]?.birthdate ?? ''}
                      onChange={(value) => editGuest(index, 'birthdate', value)}
                      error={fieldErrors[`guests[${index}].birthdate`]}
                      type="date"
                    />
                  </div>
                ))}
              </fieldset>

              <fieldset className={styles.card} disabled={isLocked}>
                <legend className={styles.cardTitle}>
                  <span className={styles.cardIcon}>
                    <CheckoutIcon name="wallet" />
                  </span>
                  <span>
                    {copy.pay}
                    <small>{copy.payHint}</small>
                  </span>
                </legend>
                <div className={styles.methods} role="radiogroup">
                  {(['card', 'vnpay'] as const).map((value) => (
                    <label key={value} className={styles.method} data-selected={method === value}>
                      <input
                        type="radio"
                        name="method"
                        value={value}
                        checked={method === value}
                        onChange={() => setMethod(value)}
                      />
                      <span className={styles.methodIcon} data-method={value}>
                        {value === 'card' ? (
                          <CheckoutIcon name="card" size={22} />
                        ) : (
                          <Image src="/payments/vnpay.svg" alt="" width={84} height={26} unoptimized />
                        )}
                      </span>
                      <span className={styles.methodText}>
                        {value === 'card' ? copy.card : copy.vnpay}
                        <small>{value === 'card' ? copy.cardHint : copy.vnpayHint}</small>
                      </span>
                      <span className={styles.methodCheck} aria-hidden="true">
                        <CheckoutIcon name="check" size={14} />
                      </span>
                    </label>
                  ))}
                </div>
                {method === 'card' && (
                  <>
                    <p className={styles.subTitle}>{copy.testCards}</p>
                    <CheckoutError error={cards.error} retry={() => void cards.refetch()} />
                    <div className={styles.testCards}>
                      {cards.data?.map((card) => (
                        <button
                          key={card.number}
                          type="button"
                          className={styles.testCard}
                          data-tone={getCardTone(card.label, card.number)}
                          aria-pressed={cardNumber === card.number}
                          onClick={() => setCardNumber(card.number)}
                        >
                          <span className={styles.cardChip} aria-hidden="true" />
                          <strong>{card.label}</strong>
                          <span className={styles.cardDigits}>
                            {card.number.replace(/(\d{4})(?=\d)/g, '$1 ')}
                          </span>
                          <span className={styles.cardBrand} aria-hidden="true">
                            {card.number.startsWith('5') ? 'Mastercard' : 'VISA'}
                          </span>
                          <span className={styles.cardSelected} aria-hidden="true">
                            <CheckoutIcon name="check" size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                    <Field
                      label={copy.cardNumber}
                      value={cardNumber}
                      onChange={setCardNumber}
                      inputMode="numeric"
                      autoComplete="off"
                      icon="card"
                      wide
                    />
                  </>
                )}
                <label className={styles.consent}>
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    {copy.policy}
                    <small>
                      {copy.policyVersion}: {order.policyVersion}
                    </small>
                  </span>
                </label>
              </fieldset>

              {challengeId && (
                <div className={`${styles.card} ${styles.otp}`}>
                  <p className={styles.cardTitle}>
                    <span className={styles.cardIcon}>
                      <CheckoutIcon name="shield" />
                    </span>
                    <span>
                      {copy.otp}
                      <small>{copy.otpHint}</small>
                    </span>
                  </p>
                  <Field
                    label={copy.otp}
                    value={otp}
                    onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={payment.isPending || otp.length !== 6}
                  >
                    {payment.isPending ? vi.api.loading : copy.confirmOtp}
                  </button>
                </div>
              )}

              {newTotal !== undefined && (
                <div className={styles.warning} role="alert">
                  <p>
                    {copy.priceChanged} <b>{formatPrice(newTotal)}</b>
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setAcceptedTotal(newTotal);
                      setNewTotal(undefined);
                    }}
                  >
                    {copy.acceptPrice}
                  </button>
                </div>
              )}
              {(fieldErrorCount > 0 || validation) && (
                <p role="alert" className={styles.error}>
                  {fieldErrorCount > 0 ? fieldSummary : validation}
                </p>
              )}
              {message && !challengeId && <p className={styles.info}>{message}</p>}
              {order.status === 'paying' && !challengeId && <p className={styles.info}>{copy.waiting}</p>}
              {/* Lỗi theo ô đã hiện ở từng ô và câu tổng bên trên, không lặp câu chung của server. */}
              <CheckoutError error={fieldErrorCount > 0 ? null : payment.error} />

              {!challengeId && (
                <div className={styles.payBar}>
                  <button
                    type="submit"
                    className={`primary-button ${styles.payButton}`}
                    disabled={isLocked || newTotal !== undefined || (method === 'card' && !cardNumber.trim())}
                  >
                    <CheckoutIcon name="lock" size={18} />
                    {payment.isPending ? vi.api.loading : `${copy.pay} ${formatPrice(total)}`}
                  </button>
                  <p className={styles.payNote}>
                    <CheckoutIcon name="shield" size={16} />
                    {copy.payHint}
                  </p>
                </div>
              )}
            </form>
          )}
        </section>
        <aside className={styles.aside}>
          <OrderSummary order={order} total={total} />
        </aside>
      </div>
    </main>
  );
}

/** Màu thẻ kiểm thử theo kết quả mô phỏng, để nhìn là biết thẻ nào thành công, thẻ nào lỗi. */
function getCardTone(label: string, number: string): string {
  const text = label.toLowerCase();
  if (text.includes('3d')) return 'secure';
  if (text.includes('từ chối')) return 'declined';
  if (text.includes('không đủ')) return 'funds';
  if (text.includes('hết hạn')) return 'expired';
  return number.startsWith('5') ? 'master' : 'visa';
}

// Năm sinh chọn được trong lịch: 1920 tới năm nay (tính một lần khi nạp file).
const BIRTH_YEAR_RANGE = [1920, new Date().getFullYear()] as const;

function Field({
  label,
  value,
  onChange,
  wide,
  icon,
  error,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  icon?: CheckoutIconName;
  /** Câu báo lỗi hiện ngay dưới ô; có thì ô viền đỏ. */
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const errorId = useId();
  const errorProps = error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};
  return (
    <label className={styles.field} data-wide={wide} data-invalid={!!error}>
      <span>{label}</span>
      {input.type === 'date' ? (
        <SoftDatePicker
          value={value}
          onChange={onChange}
          required={input.required}
          disabled={input.disabled}
          max={typeof input.max === 'string' ? input.max : undefined}
          yearRange={BIRTH_YEAR_RANGE}
          className={styles.datePicker}
          {...errorProps}
        />
      ) : icon ? (
        <span className={styles.inputIcon}>
          <CheckoutIcon name={icon} size={18} />
          <input {...input} {...errorProps} value={value} onChange={(event) => onChange(event.target.value)} />
        </span>
      ) : (
        <input {...input} {...errorProps} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
    </label>
  );
}

/** Quay lại trang trước trong Tripflix; mở thẳng link (không có trang trước) thì về trang sản phẩm. */
function BackLink({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      className={styles.backLink}
      href={fallbackHref}
      onClick={(event) => {
        const hasPreviousPage =
          window.history.length > 1 && document.referrer.startsWith(window.location.origin);
        if (!hasPreviousPage) return;
        event.preventDefault();
        router.back();
      }}
    >
      <CheckoutIcon name="back" size={16} />
      {label}
    </Link>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = [copy.review, copy.checkout, copy.paid];
  return (
    <ol className={styles.steps}>
      {labels.map((label, index) => (
        <li
          key={label}
          data-state={index + 1 < current ? 'done' : index + 1 === current ? 'current' : 'next'}
        >
          <span>{index + 1 < current ? <CheckoutIcon name="check" size={14} /> : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

// Giữ chỗ 30 phút (TF30); vòng đếm ngược vẽ theo phần thời gian còn lại.
const HOLD_SECONDS = 30 * 60;

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const countdown = holdCountdown(expiresAt, now);
  const time = `${Math.floor(countdown.secondsLeft / 60)}:${String(countdown.secondsLeft % 60).padStart(2, '0')}`;
  const ratio = Math.max(0, Math.min(1, countdown.secondsLeft / HOLD_SECONDS));
  return (
    <div className={styles.timer} data-urgent={countdown.secondsLeft < 300}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" />
        <circle cx="18" cy="18" r="15.5" pathLength={100} strokeDasharray={`${ratio * 100} 100`} />
      </svg>
      <p aria-live="polite">
        <small>{copy.holdLeft}</small>
        {countdown.expired ? vi.booking.holdExpired : t('booking.holdExpiresIn', { time })}
      </p>
    </div>
  );
}

function OrderSummary({ order, total }: { order: Order; total: number }) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryHead}>
        <span className={styles.summaryTitle}>{copy.summaryTitle}</span>
        <span className={styles.status} data-status={order.status}>
          {copy.status[order.status as keyof typeof copy.status] ?? order.status}
        </span>
      </div>
      {order.status === 'pending' && <HoldTimer expiresAt={order.holdExpiresAt} />}
      {order.items.map((item) => (
        <div key={item.id} className={styles.item}>
          <span className={styles.itemIcon} aria-hidden="true">
            <CheckoutIcon name={item.productType === 'flight' ? 'plane' : 'bed'} size={18} />
          </span>
          <div className={styles.itemBody}>
            {item.propertyName && <p className={styles.property}>{item.propertyName}</p>}
            <h2>{item.productName}</h2>
            <p>
              {item.productType === 'flight'
                ? `${vi.flights.date} · ${formatDate(item.date)}`
                : `${formatDate(item.date)} → ${formatDate(item.dateTo)} · ${item.nights} ${copy.nights}`}
            </p>
            <p>
              {item.productType === 'flight' && (order.children > 0 || order.infants > 0)
                ? `${item.ratePlanName} · ${formatPassengerMix({ adults: order.adults, children: order.children, infants: order.infants })}`
                : `${item.qty} × ${item.ratePlanName} · ${order.adults} ${copy.guests}`}
            </p>
            <p className={item.isRefundable ? styles.refundable : styles.nonRefundable}>
              {item.isRefundable ? copy.refundable : copy.nonRefundable}
              {item.freeCancelUntil && ` · ${copy.freeCancel} ${formatDate(item.freeCancelUntil)}`}
            </p>
            <p className={styles.line}>
              <span>
                {item.productType === 'flight' && (order.children > 0 || order.infants > 0)
                  ? // unitPrice là giá người lớn; lineTotal gồm cả trẻ em, em bé nên ghi đơn giá từng loại khách.
                    [
                      [vi.flights.passengerTypes.adult.label, item.unitPrice, order.adults],
                      [vi.flights.passengerTypes.child.label, item.childUnitPrice, order.children],
                      [vi.flights.passengerTypes.infant.label, item.infantUnitPrice, order.infants],
                    ]
                      .filter(([, price, count]) => price != null && Number(count) > 0)
                      .map(([label, price, count]) => `${label} ${formatPrice(Number(price))} × ${count}`)
                      .join(' · ')
                  : `${formatPrice(item.unitPrice)} × ${
                      item.productType === 'flight'
                        ? t('flights.passengers', { count: item.qty })
                        : `${item.nights} ${copy.nights} × ${item.qty}`
                    }`}
              </span>
              <b>{formatPrice(item.lineTotal)}</b>
            </p>
          </div>
        </div>
      ))}
      <p className={styles.total}>
        <span>{copy.total}</span>
        <strong>{formatPrice(total)}</strong>
      </p>
      {order.cancelReason && <p className={styles.error}>{order.cancelReason}</p>}
    </div>
  );
}

function PaymentSuccess({ order }: { order: Order }) {
  return (
    <main className={`ota-container ${styles.page}`}>
      <Steps current={3} />
      <div className={styles.success}>
        <div className={styles.successIcon} aria-hidden>
          <CheckoutIcon name="check" size={40} />
        </div>
        <h1>{copy.paymentSucceeded}</h1>
        <p>{copy.paymentSuccessBody}</p>
        {order.confirmationCode && (
          <p className={styles.code}>
            {copy.confirmation}
            <strong>{order.confirmationCode}</strong>
          </p>
        )}
        <div className={styles.successSummary}>
          <OrderSummary order={order} total={order.total} />
        </div>
        <div className={styles.actions}>
          <Link className="primary-button" href="/bookings">
            {copy.viewTrips}
          </Link>
          <Link className="secondary-button" href="/">
            {copy.continueExploring}
          </Link>
        </div>
      </div>
    </main>
  );
}
