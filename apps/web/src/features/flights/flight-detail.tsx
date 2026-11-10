'use client';

import {
  HttpError,
  getFlightPassengerMix,
  useApiSession,
  useFlightOffer,
  type FlightSearch,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { FlightIcon } from './flight-icon';
import { FlightCard, StaySuggestion, formatFlightDate, useFlightHold } from './flight-results';
import { toAirportOption } from './flight-search-form';
import { formatPassengerMix } from './passenger-picker';
import styles from './flights.module.css';

const copy = vi.flights;

interface FlightDetailProps {
  productId: string;
  date: string;
  passengers: number;
  /** Trẻ em và em bé; không đặt tên children vì trùng prop đặc biệt của React. */
  childCount: number;
  infantCount: number;
  initialFareCode: string;
}

export function FlightDetail(props: FlightDetailProps) {
  const { user } = useApiSession();
  return <Detail key={user?.id ?? 'guest'} {...props} />;
}

/** Một hạng ghế của một chuyến theo đường dẫn /flights/:id, dùng để mở thẳng hoặc chia sẻ. */
function Detail({
  productId,
  date,
  passengers,
  childCount,
  infantCount,
  initialFareCode,
}: FlightDetailProps) {
  const { user, isReady } = useApiSession();
  const passengerQuery = {
    passengers,
    ...(childCount ? { children: childCount } : {}),
    ...(infantCount ? { infants: infantCount } : {}),
  };
  const query = useFlightOffer(productId, { date, ...passengerQuery });
  const offer = query.data;
  // Khi chưa có dữ liệu thì chặng bay chưa biết; giữ chỗ chỉ cần ngày bay và số khách.
  const search: FlightSearch = {
    from: offer?.fromAirport ?? '',
    to: offer?.toAirport ?? '',
    date,
    ...passengerQuery,
  };
  const passengerMix = getFlightPassengerMix(search);
  const hold = useFlightHold(search);
  const isNotFound = query.error instanceof HttpError && query.error.status === 404;
  const selfPath =
    '/flights/' +
    encodeURIComponent(productId) +
    '?' +
    new URLSearchParams({
      date,
      ...Object.fromEntries(Object.entries(passengerQuery).map(([key, count]) => [key, String(count)])),
    });

  return (
    <section aria-labelledby="flight-detail" className={styles.results}>
      <header className={styles.resultsHeader}>
        <div>
          {offer && (
            <Link
              prefetch={false}
              className={styles.backLink}
              href={
                '/flights?' +
                new URLSearchParams({
                  from: search.from,
                  to: search.to,
                  date,
                  ...Object.fromEntries(
                    Object.entries(passengerQuery).map(([key, count]) => [key, String(count)]),
                  ),
                })
              }
            >
              <span aria-hidden="true">←</span>
              {t('flights.detailBack', { from: offer.fromAirport, to: offer.toAirport })}
            </Link>
          )}
          <h2 id="flight-detail">
            {offer
              ? toAirportOption(offer.fromAirport).city +
                ' → ' +
                toAirportOption(offer.toAirport, offer.destination.name).city
              : copy.detailTitle}
          </h2>
        </div>
        <div className={styles.resultsMeta}>
          <span>
            <FlightIcon name="calendar" size={16} />
            {formatFlightDate(date)}
          </span>
          <span>
            <FlightIcon name="users" size={16} />
            {formatPassengerMix(passengerMix)}
          </span>
        </div>
      </header>
      {query.isPending && (
        <output className={styles.loadingState}>
          <Image src="/brand/tripi-library/ui-searching.png" alt="" width={88} height={88} />
          <span>{copy.loadingFlights}</span>
        </output>
      )}
      {isNotFound ? (
        <div className={styles.loadingState} role="alert">
          <Image src="/brand/tripi-library/expr-curious.png" alt="" width={88} height={88} />
          <span>{copy.detailNotFound}</span>
          <Link prefetch={false} className={'ripple-button ' + styles.stayLink} href="/flights">
            {copy.detailSearchAgain}
          </Link>
        </div>
      ) : (
        <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      {offer && (
        <>
          <FlightCard
            flight={offer}
            cabins={[offer]}
            isLocked={!isReady || hold.isPending || hold.isSuccess}
            isHolding={hold.isPending}
            returnTo={user ? undefined : selfPath}
            initialProductId={productId}
            initialFareCode={initialFareCode}
            isInitiallyOpen
            date={date}
            passengers={passengers}
            passengerMix={passengerMix}
            onHold={(cabinId, fareCode) =>
              hold.mutate({ productId: cabinId, fareCode, flightKey: offer.flightKey })
            }
            error={hold.error}
          />
          <StaySuggestion destination={offer.destination} search={search} />
        </>
      )}
    </section>
  );
}
