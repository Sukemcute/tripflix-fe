'use client';

import { commerceApi, socialApi, useApiSession } from '@tripflix/api-client';
import type { TripAttachmentDto, TripItineraryItemDto } from '@tripflix/api-client/core-api/model/index';
import { getTripNights, getTripPlanStays, type TripPlanStay } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { useQueries, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { isOptimizedImageUrl } from '@/lib/remote-images';
import { formatPrice } from '@/features/discovery/trip-card';
import { SocialIcon } from '../live-posts';
import { getPostCover, POST_COVER_MASCOT } from '../post-cover';
import { buildPostHref } from '../search-url';
import { buildPlaceMapUrl, formatTransportRoute, getTripDayCount, groupTripDays } from './trip-plan-data';
import styles from './trip-plan-view.module.css';

const TRANSPORT_LABELS = {
  flight: vi.api.tripPlanTransportFlight,
  bus: vi.api.tripPlanTransportBus,
  train: vi.api.tripPlanTransportTrain,
  car: vi.api.tripPlanTransportCar,
  other: vi.api.tripPlanTransportOther,
} as const;

/** Trang chi tiết chuyến đi (TF25): đủ lịch trình từng ngày, nơi ở theo đêm, chi phí; sidebar Cảm hứng chỉ tóm tắt. */
export function TripPlanView({ postId }: { postId: string }) {
  const { user, isReady } = useApiSession();
  const postQuery = useQuery({
    queryKey: ['social', 'post', postId, user?.id],
    queryFn: ({ signal }) => socialApi.getPost(postId, signal),
    enabled: isReady,
    retry: false,
  });
  const post = postQuery.data?.post;
  const trip = post?.tripAttachment ?? null;
  const stays = trip ? getTripPlanStays(trip) : [];
  // Chỉ đọc thông tin khách sạn (ảnh, sao, giá từ, toạ độ); đặt phòng vẫn ở trang khách sạn.
  const hotelQueries = useQueries({
    queries: stays.map((stay) => ({
      queryKey: ['commerce', 'hotel', stay.hotelId, {}],
      queryFn: ({ signal }: { signal: AbortSignal }) => commerceApi.getHotel(stay.hotelId, {}, signal),
      staleTime: 5 * 60_000,
    })),
  });

  if (!isReady || postQuery.isPending) return <TripPlanSkeleton />;
  if (!post || !trip) return <TripPlanNotFound />;

  const days = groupTripDays(trip);
  const dayCount = getTripDayCount(trip);
  const cover =
    trip.posterUrl || post.images?.[0]?.url || getPostCover(trip.destinationName, post.title, post.hashtags) || POST_COVER_MASCOT;
  const destination = trip.destinationName?.trim();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroImage}>
          <Image src={cover} alt={post.title} fill sizes="(max-width: 860px) 100vw, 360px" unoptimized={!isOptimizedImageUrl(cover)} />
        </span>
        <div className={styles.heroText}>
          {destination && <p className={styles.eyebrow}>{destination}</p>}
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.meta}>
            {[
              dayCount > 0
                ? dayCount > 1
                  ? t('api.tripPlanDuration', { days: dayCount, nights: getTripNights(dayCount) })
                  : t('api.tripPlanDays', { days: dayCount })
                : null,
              trip.estimatedCostPerPerson
                ? t('api.tripPlanCostPerPerson', { price: formatPrice(trip.estimatedCostPerPerson) })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className={styles.byline}>
            <Link prefetch={false} href={`/u/${encodeURIComponent(post.authorId)}`}>
              {t('api.tripPlanBy', { name: post.authorName || vi.api.tripPlanAuthorFallback })}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link prefetch={false} href={buildPostHref(post.id, { postType: post.postType })}>
              {vi.api.tripPlanViewPost}
            </Link>
          </p>
        </div>
      </header>

      <div className={styles.columns}>
        <section className={styles.schedule} aria-labelledby="trip-plan-schedule">
          <h2 id="trip-plan-schedule" className={styles.sectionTitle}>
            {vi.api.tripPlanScheduleTitle}
          </h2>
          {days.length === 0 ? (
            <p className={styles.muted}>{vi.api.tripPlanEmptyDays}</p>
          ) : (
            <ol className={styles.days}>
              {days.map(({ day, items }) => (
                <li key={day} className={styles.day}>
                  <h3 className={styles.dayTitle}>
                    <span className={styles.dayNumber}>{day}</span>
                    {t('api.tripPlanDayTitle', { day })}
                  </h3>
                  <ul className={styles.stops} data-has-time={items.some((item) => item.time) || undefined}>
                    {items.map((item, index) => (
                      <TripStop key={`${day}-${index}`} item={item} destination={destination} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className={styles.side}>
          {stays.length > 0 && (
            <section aria-labelledby="trip-plan-stays">
              <h2 id="trip-plan-stays" className={styles.sectionTitle}>
                {vi.api.tripPlanStaysTitle}
              </h2>
              <ul className={styles.stays}>
                {stays.map((stay, index) => (
                  <StayCard key={stay.id} stay={stay} hotel={hotelQueries[index]?.data} />
                ))}
              </ul>
            </section>
          )}
          {trip.estimatedCostPerPerson ? <CostCard trip={trip} /> : null}
        </aside>
      </div>
    </main>
  );
}

function TripStop({ item, destination }: { item: TripItineraryItemDto; destination?: string }) {
  const route = formatTransportRoute(item.transport);
  const mapUrl = item.transport ? null : buildPlaceMapUrl({ name: item.location || item.title, destination });
  return (
    <li className={styles.stop}>
      <span className={styles.time}>{item.time}</span>
      <div className={styles.stopBody}>
        <p className={styles.stopTitle}>
          {item.transport && (
            <span className={styles.transport}>
              {TRANSPORT_LABELS[item.transport.mode] ?? vi.api.tripPlanTransportOther}
              {route ? ` ${route}` : ''} ·{' '}
            </span>
          )}
          {item.title}
        </p>
        {(item.location || mapUrl) && (
          <p className={styles.stopMeta}>
            {item.location}
            {item.location && mapUrl && <span aria-hidden="true"> · </span>}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                {vi.api.tripPlanOpenMap}
              </a>
            )}
          </p>
        )}
        {item.notes && <p className={styles.notes}>{item.notes}</p>}
      </div>
    </li>
  );
}

function StayCard({
  stay,
  hotel,
}: {
  stay: TripPlanStay;
  hotel: Awaited<ReturnType<typeof commerceApi.getHotel>> | undefined;
}) {
  const name = hotel?.name ?? stay.hotelName ?? '';
  const image = hotel?.thumbnail ?? hotel?.images[0];
  const mapUrl = hotel?.location
    ? buildPlaceMapUrl({ lat: hotel.location.lat, lng: hotel.location.lng })
    : null;
  return (
    <li className={styles.stay}>
      <StayImage url={image ?? null} name={name} />
      <div className={styles.stayBody}>
        <p className={styles.stayName}>{name}</p>
        <p className={styles.stayMeta}>
          {t('api.tripPlanStayNights', { from: stay.day, to: stay.day + stay.nights, nights: stay.nights })}
        </p>
        {hotel?.priceFrom ? (
          <p className={styles.stayMeta}>{t('api.tripPlanStayFrom', { price: formatPrice(hotel.priceFrom) })}</p>
        ) : null}
        <p className={styles.stayActions}>
          <Link prefetch={false} href={`/hotels/${encodeURIComponent(stay.hotelId)}`} className={styles.stayButton}>
            {vi.api.tripPlanViewRooms}
          </Link>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
              {vi.api.tripPlanOpenMap}
            </a>
          )}
        </p>
      </div>
    </li>
  );
}

/** Ảnh khách sạn; không có hoặc tải lỗi (ví dụ CloudFront từ chối) thì hiện icon thay vì ô trống. */
function StayImage({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || !/^https?:\/\//i.test(url) || failedUrl === url) {
    return (
      <span className={styles.stayImage} aria-hidden="true">
        <SocialIcon name="pin" size={18} />
      </span>
    );
  }
  return (
    <span className={styles.stayImage}>
      <Image
        src={url}
        alt={name}
        width={144}
        height={144}
        unoptimized={!isOptimizedImageUrl(url)}
        onError={() => setFailedUrl(url)}
      />
    </span>
  );
}

function CostCard({ trip }: { trip: TripAttachmentDto }) {
  return (
    <section className={styles.cost} aria-labelledby="trip-plan-cost">
      <h2 id="trip-plan-cost" className={styles.sectionTitle}>
        {vi.api.tripPlanCostTitle}
      </h2>
      <p className={styles.costValue}>
        {t('api.tripPlanCostPerPerson', { price: formatPrice(trip.estimatedCostPerPerson ?? 0) })}
      </p>
      <p className={styles.muted}>{trip.priceDisclaimer?.trim() || vi.api.tripPlanCostNote}</p>
    </section>
  );
}

function TripPlanSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={`${styles.hero} ${styles.skeleton}`} />
      <div className={styles.columns}>
        <div className={styles.schedule}>
          {[0, 1, 2].map((index) => (
            <div key={index} className={`${styles.skeletonLine} ${styles.skeleton}`} />
          ))}
        </div>
      </div>
    </main>
  );
}

function TripPlanNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.notFound}>
        <h1 className={styles.sectionTitle}>{vi.api.tripPlanNotFound}</h1>
        <p className={styles.muted}>{vi.api.tripPlanNotFoundHint}</p>
        <Link prefetch={false} href="/inspiration" className={styles.stayButton}>
          {vi.api.tripPlanBackToInspiration}
        </Link>
      </div>
    </main>
  );
}
