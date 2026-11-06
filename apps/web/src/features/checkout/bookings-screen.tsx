'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { commerceApi, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { formatPrice } from '@/features/discovery/trip-card';
import { CheckoutError } from './checkout-error';
import styles from './checkout.module.css';

const copy = vi.commerce;
const formatDate = (date: string) => date.split('-').reverse().join('/');

/** Chuyến đi của tôi: mọi đơn của người đang đăng nhập, mới đặt trước. */
export function BookingsScreen() {
  const { user, isReady } = useApiSession();
  return (
    <main className={`ota-container ${styles.page}`}>
      <h1 className={styles.title}>{copy.booked}</h1>
      {isReady && !user && (
        <div className={styles.card}>
          <p>{copy.loginToViewPayment}</p>
          <Link className="primary-button" href="/login?returnTo=%2Fbookings">
            {copy.login}
          </Link>
        </div>
      )}
      <BookingsList />
    </main>
  );
}

/** Danh sách chuyến đã đặt, không có khung trang: dùng ở /bookings và mục "Chuyến đã đặt" của /account. */
export function BookingsList() {
  const { user, isReady } = useApiSession();
  const query = useInfiniteQuery({
    queryKey: ['commerce', 'trips', user?.id],
    enabled: isReady && !!user,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => commerceApi.listTrips(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const trips = query.data?.pages.flatMap((page) => page.trips) ?? [];

  return (
    <>
      {query.isPending && !!user && <p>{vi.api.loading}</p>}
      <CheckoutError error={query.error} retry={() => void query.refetch()} />
      {query.isSuccess && !trips.length && (
        <div className="account-empty">
          <span className="account-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
            </svg>
          </span>
          <h3>{copy.noTrips}</h3>
          <p>{copy.noTripsHint}</p>
          <Link className="primary-button account-empty-action" href="/search">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {copy.findHotel}
          </Link>
        </div>
      )}
      <div className={styles.trips}>
        {trips.map((trip) => (
          <Link key={trip.orderId} href={`/checkout/${trip.orderId}`} className={styles.trip}>
            <div className={styles.summaryHead}>
              <span className={styles.status} data-status={trip.status}>
                {copy.status[trip.status as keyof typeof copy.status] ?? trip.status}
              </span>
              {trip.confirmationCode && <code>{trip.confirmationCode}</code>}
            </div>
            {trip.items.map((item) => (
              <div key={item.id}>
                {item.propertyName && <p className={styles.property}>{item.propertyName}</p>}
                <h2>{item.productName}</h2>
                <p>
                  {item.productType === 'flight'
                    ? `${formatDate(item.date)} · ${t('flights.passengers', { count: item.qty })} · `
                    : `${formatDate(item.date)} → ${formatDate(item.dateTo)} · ${item.nights} ${copy.nights} · ${item.qty} × `}
                  {item.ratePlanName}
                </p>
              </div>
            ))}
            <p className={styles.total}>
              <span>{copy.total}</span>
              <strong>{formatPrice(trip.total)}</strong>
            </p>
          </Link>
        ))}
      </div>
      {query.hasNextPage && (
        <button
          type="button"
          className="secondary-button"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? vi.api.loading : vi.api.next}
        </button>
      )}
    </>
  );
}
