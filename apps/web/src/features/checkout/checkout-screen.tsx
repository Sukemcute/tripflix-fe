'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  commerceApi,
  createCardPaymentOperation,
  createOtpOperation,
  createVnpayOperation,
  HttpError,
  useApiSession,
} from '@tripflix/api-client';
import { holdCountdown, isValidTripDate } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { formatPrice } from '@/features/discovery/trip-card';
import { SoftDatePicker } from '@/features/shared/soft-date-picker';
import { CheckoutError } from './checkout-error';
import styles from './checkout.module.css';

const copy = vi.commerce;
type Order = Awaited<ReturnType<typeof commerceApi.getCheckout>>;
type Method = 'card' | 'vnpay';
type GuestDraft = { fullName: string; birthdate: string };

const isValidPhone = (phone: string) => /^0\d{9,10}$/.test(phone);
const isValidEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const formatDate = (date: string) => date.split('-').reverse().join('/');

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
      if (!name.trim() || !isValidPhone(phone) || !isValidEmail(email.trim())) {
        setValidation(copy.invalidContact);
        return null;
      }
      const passengers = Array.from(
        { length: order.passengersRequired },
        (_, index) => guests[index] ?? { fullName: '', birthdate: '' },
      );
      const today = new Date().toISOString().slice(0, 10);
      if (
        passengers.some(
          (guest) =>
            !guest.fullName.trim() ||
            !isValidTripDate(guest.birthdate, '1900-01-01') ||
            guest.birthdate > today,
        )
      ) {
        setValidation(copy.invalidGuests);
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
  const editGuest = (index: number, key: keyof GuestDraft, value: string) =>
    setGuests((previous) => ({
      ...previous,
      [index]: { fullName: '', birthdate: '', ...previous[index], [key]: value },
    }));

  return (
    <main className={`ota-container ${styles.page}`}>
      <Steps current={2} />
      <h1 className={styles.title}>{copy.checkout}</h1>
      <div className={styles.layout}>
        <section className={styles.main}>
          {isExpired ? (
            <div className={styles.card}>
              <p role="alert" className={styles.error}>
                {copy.expired}
              </p>
              <Link className="primary-button" href="/search">
                {copy.findHotel}
              </Link>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                payment.mutate(challengeId ? 'otp' : 'pay');
              }}
            >
              <fieldset className={styles.card} disabled={isLocked}>
                <legend className={styles.cardTitle}>{copy.contact}</legend>
                <div className={styles.fields}>
                  <Field label={copy.name} value={name} onChange={setName} autoComplete="name" wide />
                  <Field label={copy.phone} value={phone} onChange={setPhone} autoComplete="tel" type="tel" />
                  <Field label={copy.email} value={email} onChange={setEmail} autoComplete="email" type="email" />
                </div>
                {Array.from({ length: order.passengersRequired }, (_, index) => (
                  <div key={index} className={styles.fields}>
                    <p className={styles.subTitle}>
                      {copy.guest} {index + 1}
                    </p>
                    <Field
                      label={copy.name}
                      value={guests[index]?.fullName ?? ''}
                      onChange={(value) => editGuest(index, 'fullName', value)}
                    />
                    <Field
                      label={copy.birthdate}
                      value={guests[index]?.birthdate ?? ''}
                      onChange={(value) => editGuest(index, 'birthdate', value)}
                      type="date"
                    />
                  </div>
                ))}
              </fieldset>

              <fieldset className={styles.card} disabled={isLocked}>
                <legend className={styles.cardTitle}>{copy.pay}</legend>
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
                      <span>{value === 'card' ? copy.card : copy.vnpay}</span>
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
                          aria-pressed={cardNumber === card.number}
                          onClick={() => setCardNumber(card.number)}
                        >
                          <strong>{card.label}</strong>
                          <span>{card.number.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
                        </button>
                      ))}
                    </div>
                    <Field
                      label={copy.cardNumber}
                      value={cardNumber}
                      onChange={setCardNumber}
                      inputMode="numeric"
                      autoComplete="off"
                      wide
                    />
                  </>
                )}
                <label className={styles.consent}>
                  <input type="checkbox" checked={hasConsent} onChange={(event) => setConsent(event.target.checked)} />
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
                  <p className={styles.cardTitle}>{copy.otp}</p>
                  <p className="small muted">{copy.otpHint}</p>
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
              {validation && (
                <p role="alert" className={styles.error}>
                  {validation}
                </p>
              )}
              {message && !challengeId && <p className={styles.info}>{message}</p>}
              {order.status === 'paying' && !challengeId && <p className={styles.info}>{copy.waiting}</p>}
              <CheckoutError error={payment.error} />

              {!challengeId && (
                <button
                  type="submit"
                  className={`primary-button ${styles.payButton}`}
                  disabled={
                    isLocked || newTotal !== undefined || (method === 'card' && !cardNumber.trim())
                  }
                >
                  {payment.isPending ? vi.api.loading : `${copy.pay} ${formatPrice(total)}`}
                </button>
              )}
            </form>
          )}
        </section>
        <aside className={styles.aside}>
          <OrderSummary order={order} total={total} />
          <button type="button" className={styles.linkButton} onClick={() => void query.refetch()}>
            {copy.checkStatus}
          </button>
        </aside>
      </div>
    </main>
  );
}

// Năm sinh chọn được trong lịch: 1920 tới năm nay (tính một lần khi nạp file).
const BIRTH_YEAR_RANGE = [1920, new Date().getFullYear()] as const;

function Field({
  label,
  value,
  onChange,
  wide,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className={styles.field} data-wide={wide}>
      <span>{label}</span>
      {input.type === 'date' ? (
        <SoftDatePicker
          value={value}
          onChange={onChange}
          required={input.required}
          disabled={input.disabled}
          max={typeof input.max === 'string' ? input.max : undefined}
          yearRange={BIRTH_YEAR_RANGE}
        />
      ) : (
        <input {...input} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = [copy.review, copy.checkout, copy.paid];
  return (
    <ol className={styles.steps}>
      {labels.map((label, index) => (
        <li key={label} data-state={index + 1 < current ? 'done' : index + 1 === current ? 'current' : 'next'}>
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const countdown = holdCountdown(expiresAt, now);
  const time = `${Math.floor(countdown.secondsLeft / 60)}:${String(countdown.secondsLeft % 60).padStart(2, '0')}`;
  return (
    <p className={styles.timer} data-urgent={countdown.secondsLeft < 300} aria-live="polite">
      {countdown.expired ? vi.booking.holdExpired : t('booking.holdExpiresIn', { time })}
    </p>
  );
}

function OrderSummary({ order, total }: { order: Order; total: number }) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryHead}>
        <span className={styles.status} data-status={order.status}>
          {copy.status[order.status as keyof typeof copy.status] ?? order.status}
        </span>
        {order.status === 'pending' && <HoldTimer expiresAt={order.holdExpiresAt} />}
      </div>
      {order.items.map((item) => (
        <div key={item.id} className={styles.item}>
          {item.propertyName && <p className={styles.property}>{item.propertyName}</p>}
          <h2>{item.productName}</h2>
          <p>
            {item.productType === 'flight'
              ? `${vi.flights.date} · ${formatDate(item.date)}`
              : `${formatDate(item.date)} → ${formatDate(item.dateTo)} · ${item.nights} ${copy.nights}`}
          </p>
          <p>
            {item.qty} × {item.ratePlanName} · {order.adults} {copy.guests}
          </p>
          <p className={item.isRefundable ? styles.refundable : 'small muted'}>
            {item.isRefundable ? copy.refundable : copy.nonRefundable}
            {item.freeCancelUntil && ` · ${copy.freeCancel} ${formatDate(item.freeCancelUntil)}`}
          </p>
          <p className={styles.line}>
            <span>
              {formatPrice(item.unitPrice)} × {item.productType === 'flight'
                ? t('flights.passengers', { count: item.qty })
                : `${item.nights} ${copy.nights} × ${item.qty}`}
            </span>
            <b>{formatPrice(item.lineTotal)}</b>
          </p>
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
          ✓
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
