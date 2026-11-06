'use client';

import { useMutation } from '@tanstack/react-query';
import {
  buildFlightCheckout,
  createCheckoutOperation,
  useApiSession,
  useFlightOffers,
  type FlightSearch,
} from '@tripflix/api-client';
import type { FlightOfferDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckoutError } from '@/features/checkout/checkout-error';
import { formatPrice } from '@/features/discovery/trip-card';
import { ApiErrorNotice } from '@/features/shared/api-state';
import styles from './flights.module.css';

const copy = vi.flights;
const getReason = (offer: FlightOfferDto) => (offer.reason ? copy.reasons[offer.reason] : copy.unavailable);

interface FlightResultsProps {
  search: FlightSearch;
  initialProductId: string;
  initialFareCode: string;
}

export function FlightResults(props: FlightResultsProps) {
  const { user } = useApiSession();
  return <Results key={user?.id ?? 'guest'} {...props} />;
}

function Results({ search, initialProductId, initialFareCode }: FlightResultsProps) {
  const { user, isReady } = useApiSession();
  const router = useRouter();
  const query = useFlightOffers(search);
  const [create] = useState(createCheckoutOperation);
  const hold = useMutation({
    mutationFn: ({ productId, fareCode }: { productId: string; fareCode: string; flightKey: string }) =>
      create(buildFlightCheckout(search, productId, fareCode)),
    retry: false,
    onSuccess: ({ orderId }) => router.push('/checkout/' + encodeURIComponent(orderId)),
  });
  const params = new URLSearchParams({ ...search, passengers: String(search.passengers) });

  return (
    <section aria-labelledby="flight-results" className={styles.results}>
      <header>
        <h2 id="flight-results">{t('flights.results', { from: search.from, to: search.to })}</h2>
        <p className="muted">
          {search.date.split('-').reverse().join('/')} ·{' '}
          {t('flights.passengers', { count: search.passengers })}
        </p>
      </header>
      {query.isPending && <output className="empty-state">{vi.api.loading}</output>}
      <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && <output className="empty-state">{copy.empty}</output>}
      {query.data?.map(
        ([first, ...otherCabins]) =>
          first && (
            <FlightCard
              key={first.flightKey}
              flight={first}
              cabins={[first, ...otherCabins]}
              isLocked={!isReady || hold.isPending || hold.isSuccess}
              isHolding={hold.isPending && hold.variables?.flightKey === first.flightKey}
              returnTo={user ? undefined : '/flights?' + params}
              initialProductId={initialProductId}
              initialFareCode={initialFareCode}
              onHold={(productId, fareCode) =>
                hold.mutate({ productId, fareCode, flightKey: first.flightKey })
              }
              error={hold.variables?.flightKey === first.flightKey ? hold.error : null}
            />
          ),
      )}
    </section>
  );
}

function FlightCard({
  flight,
  cabins,
  isLocked,
  isHolding,
  returnTo,
  initialProductId,
  initialFareCode,
  onHold,
  error,
}: {
  flight: FlightOfferDto;
  cabins: FlightOfferDto[];
  isLocked: boolean;
  isHolding: boolean;
  returnTo?: string;
  initialProductId: string;
  initialFareCode: string;
  onHold: (productId: string, fareCode: string) => void;
  error: unknown;
}) {
  const initialCabin = cabins.find((offer) => offer.productId === initialProductId);
  const [productId, setProductId] = useState(initialCabin?.productId ?? flight.productId);
  const [fareCode, setFareCode] = useState(initialCabin ? initialFareCode : '');
  const cabin = cabins.find((offer) => offer.productId === productId) ?? flight;
  const fare = cabin.fares.find((option) => option.code === fareCode) ?? cabin.fares[0];
  const totalPrice = fare?.totalPrice;
  const unitPrice = fare?.pricePerPerson;
  const canBook = cabin.isAvailable && fare !== undefined && totalPrice != null && unitPrice != null;

  return (
    <article className={styles.card}>
      <header className={styles.flightInfo}>
        <div>
          <p className="eyebrow">
            {flight.airline ? flight.airline + ' · ' + flight.flightKey : flight.flightKey}
          </p>
          <h3>{flight.name}</h3>
        </div>
        <div className={styles.route}>
          <div>
            <strong>{flight.fromAirport}</strong>
            {flight.departTime && <span>{flight.departTime.slice(0, 5)}</span>}
          </div>
          <span className={styles.routeLine} aria-hidden="true">
            ✈
          </span>
          <div>
            <strong>{flight.toAirport}</strong>
            {flight.arriveTime && <span>{flight.arriveTime.slice(0, 5)}</span>}
          </div>
        </div>
      </header>
      <div className={styles.fare}>
        <div className={styles.options}>
          <label>
            {copy.cabin}
            <select
              value={cabin.productId}
              aria-label={copy.cabin}
              disabled={isLocked}
              onChange={(event) => {
                setProductId(event.target.value);
                setFareCode('');
              }}
            >
              {cabins.map((offer) => (
                <option key={offer.productId} value={offer.productId}>
                  {offer.cabinName}
                  {!offer.isAvailable && ' · ' + getReason(offer)}
                </option>
              ))}
            </select>
          </label>
          {cabin.isAvailable && cabin.fares.length > 0 && (
            <label>
              {copy.fare}
              <select
                value={fare?.code}
                aria-label={copy.fare}
                disabled={isLocked}
                onChange={(event) => setFareCode(event.target.value)}
              >
                {cabin.fares.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                    {option.totalPrice != null && ' · ' + formatPrice(option.totalPrice)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {canBook ? (
          <div className={styles.total}>
            <span className="small muted">{vi.commerce.total}</span>
            <strong>{formatPrice(totalPrice)}</strong>
            <span className="small muted">
              {t('flights.perPassenger', { price: formatPrice(unitPrice) })}
            </span>
            <span className="small muted">
              {fare.isRefundable && fare.freeCancelDays > 0
                ? t('flights.freeCancel', { count: fare.freeCancelDays })
                : fare.isRefundable
                  ? vi.commerce.refundable
                  : vi.commerce.nonRefundable}
            </span>
          </div>
        ) : (
          <p className="small muted">{getReason(cabin)}</p>
        )}
        <div className={styles.booking}>
          {canBook && !isLocked && returnTo ? (
            <Link
              className="secondary-button"
              href={
                '/login?returnTo=' +
                encodeURIComponent(
                  returnTo +
                    '&' +
                    new URLSearchParams({ productId: cabin.productId, ratePlanCode: fare.code }),
                )
              }
            >
              {vi.commerce.login}
            </Link>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={isLocked || !canBook}
              onClick={() => fare && onHold(cabin.productId, fare.code)}
            >
              {isHolding ? vi.api.loading : copy.choose}
            </button>
          )}
          {canBook && cabin.remaining != null && (
            <p className="small muted">{t('flights.remaining', { count: cabin.remaining })}</p>
          )}
          <CheckoutError error={error} />
        </div>
      </div>
    </article>
  );
}
