'use client';

import { TripStopIcon } from '../feed/trip-plan-timeline';
import { commerceApi, socialApi, useApiSession, usePostSearchFeed } from '@tripflix/api-client';
import { tripPlanPostQueryKey } from '@tripflix/api-client/profile-query-keys';
import type {
  SocialPostDto,
  TripAttachmentDto,
  TripItineraryItemDto,
} from '@tripflix/api-client/core-api/model/index';
import { getBookableTripPlan, getTripNights, getTripPlanStays, type TripPlanStay } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatPrice } from '@/features/discovery/trip-card';
import { isOptimizedImageUrl } from '@/lib/remote-images';
import { SocialIcon, formatCompactCount } from '../live-posts';
import { getPostCover, getPostImages, POST_COVER_MASCOT } from '../post-cover';
import { shouldShowTripPlanSkeleton } from './trip-plan-gate';
import { buildPostHref } from '../search-url';
import { ShareMenu, type ShareMenuHandle } from '../share-menu';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import {
  assignStopThumbnails,
  buildPlaceMapUrl,
  countTripStops,
  estimateStayCost,
  findFirstFlightRoute,
  formatTransportRoute,
  getAuthorShortName,
  getTripDayCount,
  groupTripDays,
  listFlightRoutes,
  pickSimilarTrips,
  addStayStops,
  getTransportPrefixRoute,
} from './trip-plan-data';
import styles from './trip-plan-view.module.css';

type HotelDetail = Awaited<ReturnType<typeof commerceApi.getHotel>>;

const TRANSPORT_LABELS = {
  flight: vi.api.tripPlanTransportFlight,
  bus: vi.api.tripPlanTransportBus,
  train: vi.api.tripPlanTransportTrain,
  car: vi.api.tripPlanTransportCar,
  other: vi.api.tripPlanTransportOther,
} as const;

const MOMENT_TILES = 5;

function getDurationLabel(dayCount: number): string | null {
  if (dayCount <= 0) return null;
  return dayCount > 1
    ? t('api.tripPlanDuration', { days: dayCount, nights: getTripNights(dayCount) })
    : t('api.tripPlanDays', { days: dayCount });
}

function getCover(post: SocialPostDto): string {
  const trip = post.tripAttachment;
  return (
    trip?.posterUrl ||
    post.images?.[0]?.url ||
    getPostCover(trip?.destinationName, post.title, post.hashtags) ||
    POST_COVER_MASCOT
  );
}

/**
 * Trang chi tiết chuyến đi (TF25). Thứ tự trả lời ba câu người xem tự hỏi: chuyến này có hợp mình không (ảnh lớn,
 * người đăng, số liệu nhanh), đi thật thì thế nào (lịch trình kèm mẹo, khoảnh khắc, người đi trước nói gì), đi giống
 * vậy bằng cách nào (nơi ở, chi phí).
 */
export function TripPlanView({ postId }: { postId: string }) {
  const { user, isReady } = useApiSession();
  const postQuery = useQuery({
    queryKey: tripPlanPostQueryKey(postId, user?.id),
    queryFn: ({ signal }) => socialApi.getPost(postId, signal),
    enabled: isReady,
    retry: false,
  });
  const post = postQuery.data?.post;
  const trip = post?.tripAttachment ?? null;
  const stays = trip ? getTripPlanStays(trip) : [];
  // Chỉ đọc thông tin khách sạn (ảnh, giá từ, toạ độ); đặt phòng vẫn ở trang khách sạn.
  const hotelQueries = useQueries({
    queries: stays.map((stay) => ({
      queryKey: ['commerce', 'hotel', stay.hotelId, {}],
      queryFn: ({ signal }: { signal: AbortSignal }) => commerceApi.getHotel(stay.hotelId, {}, signal),
      staleTime: 5 * 60_000,
    })),
  });
  const hotelsById = new Map<string, HotelDetail>();
  stays.forEach((stay, index) => {
    const hotel = hotelQueries[index]?.data;
    if (hotel) hotelsById.set(stay.hotelId, hotel);
  });

  if (shouldShowTripPlanSkeleton({ hasPost: !!post, isReady, isPending: postQuery.isPending })) {
    return <TripPlanSkeleton />;
  }
  if (!post || !trip) return <TripPlanNotFound />;

  const dayCount = getTripDayCount(trip);
  const cover = getCover(post);
  const destination = trip.destinationName?.trim();
  const tipAuthor = getAuthorShortName(post.authorName) ?? vi.api.tripPlanAuthorFallback;
  const stopCount = countTripStops(trip);
  const flightRoute = findFirstFlightRoute(trip);

  return (
    <main className={styles.page}>
      <div className={styles.cover}>
        <Image
          src={cover}
          alt={post.title}
          fill
          priority
          sizes="100vw"
          unoptimized={!isOptimizedImageUrl(cover)}
        />
      </div>

      <div className={styles.container}>
        <TripHeader
          post={post}
          destination={destination}
          durationLabel={getDurationLabel(dayCount)}
          isBookmarked={Boolean(postQuery.data?.viewerContext?.isBookmarked)}
          isSignedIn={Boolean(user)}
        />

        <div className={styles.stats}>
          <Stat label={vi.api.tripPlanStatDuration} value={getDurationLabel(dayCount) ?? '—'} />
          <Stat
            label={vi.api.tripPlanStatStops}
            value={
              stays.length > 0
                ? t('api.tripPlanStatStopsValue', { stops: stopCount, hotels: stays.length })
                : t('api.tripPlanStatStopsOnly', { stops: stopCount })
            }
          />
          <Stat
            label={vi.api.tripPlanStatCost}
            value={
              trip.estimatedCostPerPerson
                ? t('api.tripPlanCostPerPerson', { price: formatPrice(trip.estimatedCostPerPerson) })
                : vi.api.tripPlanStatCostEmpty
            }
            isAccent={Boolean(trip.estimatedCostPerPerson)}
          />
          <Stat label={vi.api.tripPlanStatTravel} value={flightRoute ?? vi.api.tripPlanStatTravelSelf} />
        </div>

        <div className={styles.columns}>
          <div className={styles.mainColumn}>
            <section aria-labelledby="trip-plan-schedule">
              <h2 id="trip-plan-schedule" className={styles.sectionHeading}>
                {vi.api.tripPlanScheduleHeading}
              </h2>
              <TripSchedule
                trip={trip}
                destination={destination}
                tipAuthor={tipAuthor}
                hotelsById={hotelsById}
                stays={stays}
                imagePool={getTripImages(post)}
              />
            </section>

            <TripMoments post={post} />
          </div>

          <aside className={styles.side}>
            {stays.length > 0 && (
              <section className={styles.panel} aria-labelledby="trip-plan-stays">
                <h2 id="trip-plan-stays" className={styles.panelTitle}>
                  {vi.api.tripPlanStaysTitle}
                </h2>
                <ul className={styles.stays}>
                  {stays.map((stay) => (
                    <StayCard key={stay.id} stay={stay} hotel={hotelsById.get(stay.hotelId)} />
                  ))}
                </ul>
              </section>
            )}
            <CostBreakdown trip={trip} postId={post.id} stays={stays} hotelsById={hotelsById} />
          </aside>
        </div>

        <AuthorCard post={post} />
        <SimilarTrips postId={post.id} destination={destination} />
      </div>
    </main>
  );
}

function TripHeader({
  post,
  destination,
  durationLabel,
  isBookmarked,
  isSignedIn,
}: {
  post: SocialPostDto;
  destination?: string;
  durationLabel: string | null;
  isBookmarked: boolean;
  isSignedIn: boolean;
}) {
  const client = useQueryClient();
  const shareMenuRef = useRef<ShareMenuHandle | null>(null);
  const [isSaved, setIsSaved] = useState(isBookmarked);
  const bookmark = useMutation({
    mutationFn: (next: boolean) => socialApi.setBookmark(post.id, next),
    onMutate: (next) => setIsSaved(next),
    onError: (_error, next) => setIsSaved(!next),
    onSettled: () => void client.invalidateQueries({ queryKey: ['social'] }),
  });
  const share = useMutation({ mutationFn: (id: string) => socialApi.sharePost(id) });
  const loginHref = `/login?returnTo=${encodeURIComponent(`/trip-plans/${post.id}`)}`;
  const initial = (post.authorName ?? '?').trim().charAt(0).toUpperCase();

  return (
    <header className={styles.heroCard}>
      <div className={styles.heroTop}>
        <div className={styles.heroText}>
          {destination && <p className={styles.eyebrow}>{destination}</p>}
          <h1 className={styles.title}>{post.title}</h1>
          {durationLabel && <p className={styles.subtitle}>{durationLabel}</p>}
        </div>
        <div className={styles.actions}>
          {isSignedIn ? (
            <button
              type="button"
              className={styles.actionButton}
              aria-pressed={isSaved}
              disabled={bookmark.isPending}
              onClick={() => bookmark.mutate(!isSaved)}
            >
              <SocialIcon name="bookmark" size={17} />
              {isSaved ? vi.api.tripPlanSaved : vi.api.tripPlanSave}
            </button>
          ) : (
            <Link prefetch={false} href={loginHref} className={styles.actionButton}>
              <SocialIcon name="bookmark" size={17} />
              {vi.api.tripPlanSave}
            </Link>
          )}
          <button
            type="button"
            className={styles.actionButton}
            onClick={(event) =>
              shareMenuRef.current?.toggle(event.currentTarget, {
                postId: post.id,
                postType: post.postType,
                title: post.title,
              })
            }
          >
            <SocialIcon name="share" size={17} />
            {vi.api.tripPlanShare}
          </button>
          <ShareMenu ref={shareMenuRef} side="above" onShared={(id) => share.mutate(id)} />
        </div>
      </div>

      <div className={styles.authorRow}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
          <AvatarPhoto userId={post.authorId} />
        </span>
        <div className={styles.authorText}>
          <Link
            prefetch={false}
            href={`/u/${encodeURIComponent(post.authorId)}`}
            className={styles.authorName}
          >
            {post.authorName || vi.api.tripPlanAuthorFallback}
          </Link>
          <Link
            prefetch={false}
            href={buildPostHref(post.id, { postType: post.postType })}
            className={styles.subtleLink}
          >
            {vi.api.tripPlanViewPost}
          </Link>
        </div>
        <p className={styles.counts}>
          <span>{t('api.tripPlanLikes', { count: formatCompactCount(post.reactionTotal) })}</span>
          <span>{t('api.tripPlanSaves', { count: formatCompactCount(post.bookmarkCount) })}</span>
          <span>{t('api.tripPlanComments', { count: formatCompactCount(post.commentCount) })}</span>
        </p>
      </div>
    </header>
  );
}

function Stat({ label, value, isAccent = false }: { label: string; value: string; isAccent?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} data-accent={isAccent || undefined}>
        {value}
      </span>
    </div>
  );
}

function TripSchedule({
  trip,
  destination,
  tipAuthor,
  hotelsById,
  stays,
  imagePool,
}: {
  trip: TripAttachmentDto;
  destination?: string;
  tipAuthor: string;
  hotelsById: Map<string, HotelDetail>;
  stays: TripPlanStay[];
  imagePool: string[];
}) {
  const days = addStayStops(
    groupTripDays(trip),
    stays,
    ({ nights }) => t('mobile.tripPlan.hotelTitle', { nights }),
    trip.hotelName,
  );
  if (days.length === 0) return <p className={styles.muted}>{vi.api.tripPlanEmptyDays}</p>;
  // Ảnh từng điểm theo đúng thứ tự hiện; chặng di chuyển không có ảnh.
  const places = days.flatMap(({ items }) => items).filter((item) => !item.transport);
  const thumbnails = assignStopThumbnails(
    places.map((item) => getPostCover(item.location || destination, item.title)),
    imagePool,
  );
  const thumbnailOf = new Map(places.map((item, index) => [item, thumbnails[index] ?? null]));
  return (
    <ol className={styles.days}>
      {days.map(({ day, items }) => (
        <li key={day} className={styles.day}>
          <h3 className={styles.dayTitle}>{t('api.tripPlanDayTitle', { day })}</h3>
          <ul className={styles.stops}>
            {items.map((item, index) => (
              <TripStop
                key={`${day}-${index}`}
                item={item}
                destination={destination}
                tipAuthor={tipAuthor}
                hotel={item.hotel ? hotelsById.get(item.hotel.hotelId) : undefined}
                thumbnail={thumbnailOf.get(item) ?? null}
              />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function TripStop({
  item,
  destination,
  tipAuthor,
  hotel,
  thumbnail,
}: {
  item: TripItineraryItemDto;
  destination?: string;
  tipAuthor: string;
  hotel?: HotelDetail;
  thumbnail: string | null;
}) {
  const fullRoute = formatTransportRoute(item.transport);
  const route = getTransportPrefixRoute(item.title, fullRoute);
  // Tiêu đề đã là "Bay HAN → DLI" thì bỏ hẳn tiền tố phương tiện, chỉ còn icon + tiêu đề.
  const showTransportPrefix = !!item.transport && !(fullRoute && !route);
  const mapUrl = item.transport
    ? null
    : hotel?.location
      ? buildPlaceMapUrl({ lat: hotel.location.lat, lng: hotel.location.lng })
      : buildPlaceMapUrl({ name: item.location || item.title, destination });
  const price = hotel?.priceFrom ? t('api.tripPlanPerNight', { price: formatPrice(hotel.priceFrom) }) : null;
  const metaParts = [
    item.location ? <span key="location">{item.location}</span> : null,
    mapUrl ? (
      <a key="map" href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
        {vi.api.tripPlanOpenMap}
      </a>
    ) : null,
    item.hotel ? (
      <Link
        key="rooms"
        prefetch={false}
        href={`/hotels/${encodeURIComponent(item.hotel.hotelId)}`}
        className={styles.inlineLink}
      >
        {vi.api.tripPlanViewRooms}
      </Link>
    ) : null,
  ].filter((part) => part !== null);

  return (
    <li className={styles.stop} data-has-thumb={thumbnail ? true : undefined}>
      {thumbnail && (
        <span className={styles.stopThumb}>
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 860px) 100vw, 200px"
            unoptimized={!isOptimizedImageUrl(thumbnail)}
          />
        </span>
      )}
      <div className={styles.stopBody}>
        {(item.time || price) && (
          <div className={styles.stopHead}>
            <span className={styles.time}>{item.time}</span>
            {price && <span className={styles.price}>{price}</span>}
          </div>
        )}
        <p className={styles.stopTitle}>
          <TripStopIcon item={item} />
          {showTransportPrefix && item.transport && (
            <span className={styles.transport}>
              {TRANSPORT_LABELS[item.transport.mode] ?? vi.api.tripPlanTransportOther}
              {route ? ` ${route}` : ''} ·{' '}
            </span>
          )}
          {item.title}
        </p>
        {metaParts.length > 0 && (
          <p className={styles.stopMeta}>
            {metaParts.flatMap((part, index) =>
              index === 0
                ? [part]
                : [
                    <span key={`dot-${index}`} aria-hidden="true">
                      {' '}
                      ·{' '}
                    </span>,
                    part,
                  ],
            )}
          </p>
        )}
        {item.notes && (
          <p className={styles.tip}>
            <strong>{t('api.tripPlanTipFrom', { name: tipAuthor })}</strong> {item.notes}
          </p>
        )}
      </div>
    </li>
  );
}

/** Bộ ảnh của chuyến, cùng nguồn với thẻ bài ở feed: ảnh tác giả; không có thì ảnh minh hoạ theo điểm đến, điểm dừng. */
function getTripImages(post: SocialPostDto): string[] {
  const trip = post.tripAttachment;
  return getPostImages({
    uploadedImageUrls: post.images?.map((image) => image.url),
    mediaIds: post.mediaIds,
    posterUrl: trip?.posterUrl,
    destinationName: trip?.destinationName,
    hotelName: trip?.hotelName,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    itineraryItems: trip?.items,
  }).map((image) => image.src);
}

/**
 * Ảnh của chuyến, cùng nguồn với thẻ bài ở feed: ảnh tác giả tải lên; bài không có ảnh thì ảnh minh hoạ theo điểm
 * đến và các điểm dừng. Bài là Reels thì ô lớn đầu tiên mở Reel của chuyến.
 */
function TripMoments({ post }: { post: SocialPostDto }) {
  const images = getTripImages(post).map((url, index) => ({ id: `${index}-${url}`, url }));
  const isReel = post.postType === 'video';
  if (images.length === 0 && !isReel) return null;
  const tiles = images.slice(0, isReel ? MOMENT_TILES - 1 : MOMENT_TILES);
  const hiddenCount = images.length - tiles.length;
  return (
    <section aria-labelledby="trip-plan-moments">
      <h2 id="trip-plan-moments" className={styles.sectionHeading}>
        {vi.api.tripPlanMomentsTitle}
      </h2>
      <div className={styles.moments}>
        {isReel && (
          <Link
            prefetch={false}
            href={buildPostHref(post.id, { postType: 'video' })}
            className={`${styles.momentTile} ${styles.momentLarge} ${styles.momentReel}`}
            style={{ backgroundImage: `url(${getCover(post)})` }}
          >
            <span className={styles.momentReelLabel}>
              <SocialIcon name="video" size={20} />
              {vi.api.tripPlanWatchReel}
            </span>
          </Link>
        )}
        {tiles.map((image, index) => (
          <span
            key={image.id}
            className={`${styles.momentTile} ${!isReel && index === 0 ? styles.momentLarge : ''}`}
          >
            <Image
              src={image.url}
              alt=""
              fill
              sizes="(max-width: 860px) 50vw, 260px"
              unoptimized={!isOptimizedImageUrl(image.url)}
            />
            {index === tiles.length - 1 && hiddenCount > 0 && (
              <span className={styles.momentMore}>{t('api.tripPlanMorePhotos', { count: hiddenCount })}</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}

function StayCard({ stay, hotel }: { stay: TripPlanStay; hotel: HotelDetail | undefined }) {
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
          <p className={styles.stayMeta}>
            {t('api.tripPlanStayFrom', { price: formatPrice(hotel.priceFrom) })}
          </p>
        ) : null}
        <p className={styles.stayActions}>
          <Link
            prefetch={false}
            href={`/hotels/${encodeURIComponent(stay.hotelId)}`}
            className={styles.pillLink}
          >
            {vi.api.tripPlanViewRooms}
          </Link>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
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

/**
 * Chi phí từng mục từ dữ liệu có thật: tiền phòng = giá từ hiện tại × số đêm (mỗi phòng), các chặng bay (giá theo ngày
 * đặt nên chỉ liệt kê), tổng/người tác giả ghi. Lịch trình chưa có giá từng điểm nên không chia ăn uống, tham quan.
 */
function CostBreakdown({
  trip,
  postId,
  stays,
  hotelsById,
}: {
  trip: TripAttachmentDto;
  postId: string;
  stays: TripPlanStay[];
  hotelsById: Map<string, HotelDetail>;
}) {
  const stayCost = estimateStayCost(
    stays,
    new Map(stays.map((stay) => [stay.hotelId, hotelsById.get(stay.hotelId)?.priceFrom])),
  );
  const flights = listFlightRoutes(trip);
  if (stays.length === 0 && flights.length === 0 && !trip.estimatedCostPerPerson) return null;
  return (
    <section className={styles.panel} aria-labelledby="trip-plan-cost">
      <h2 id="trip-plan-cost" className={styles.panelTitle}>
        {vi.api.tripPlanCostBreakdownTitle}
      </h2>
      <ul className={styles.costRows}>
        {stays.length > 0 && (
          <li className={styles.costRow}>
            <span>{t('api.tripPlanCostStay', { nights: stayCost.nights })}</span>
            <strong>
              {stayCost.total > 0
                ? t('api.tripPlanCostFromPerRoom', { price: formatPrice(stayCost.total) })
                : vi.api.tripPlanCostNoPrice}
            </strong>
          </li>
        )}
        {flights.map((route, index) => (
          <li key={`${route}-${index}`} className={styles.costRow}>
            <span>{t('api.tripPlanCostFlight', { route })}</span>
            <strong>{vi.api.tripPlanCostOnBooking}</strong>
          </li>
        ))}
      </ul>
      {trip.estimatedCostPerPerson ? (
        <div className={styles.costTotal}>
          <span>{vi.api.tripPlanCostAuthorTotal}</span>
          <strong>
            {t('api.tripPlanCostPerPerson', { price: formatPrice(trip.estimatedCostPerPerson) })}
          </strong>
        </div>
      ) : null}
      <p className={styles.muted}>{trip.priceDisclaimer?.trim() || vi.api.tripPlanCostNote}</p>
      {getBookableTripPlan(trip) && (
        <Link
          prefetch={false}
          className={styles.costBookingButton}
          href={`/coming-soon?postId=${encodeURIComponent(postId)}`}
        >
          Tải app để đặt combo <span aria-hidden="true">↗</span>
        </Link>
      )}
    </section>
  );
}

function AuthorCard({ post }: { post: SocialPostDto }) {
  return (
    <section className={styles.authorCard} aria-label={vi.api.tripPlanAuthorTitle}>
      <span className={`${styles.avatar} ${styles.avatarLarge}`} aria-hidden="true">
        {(post.authorName ?? '?').trim().charAt(0).toUpperCase()}
        <AvatarPhoto userId={post.authorId} />
      </span>
      <div className={styles.authorText}>
        <span className={styles.statLabel}>{vi.api.tripPlanAuthorTitle}</span>
        <span className={styles.authorCardName}>{post.authorName || vi.api.tripPlanAuthorFallback}</span>
      </div>
      <Link prefetch={false} href={`/u/${encodeURIComponent(post.authorId)}`} className={styles.pillLink}>
        {vi.api.tripPlanViewProfile}
      </Link>
    </section>
  );
}

/** Chuyến tương tự: tìm bài cùng điểm đến qua discovery, chỉ giữ bài có lịch trình. */
function SimilarTrips({ postId, destination }: { postId: string; destination?: string }) {
  // Trang đầu kết quả tìm theo điểm đến (cùng hook với ô tìm của tab Cảm hứng); không có điểm đến thì không tìm.
  const similarQuery = usePostSearchFeed(destination ?? '');
  const trips = pickSimilarTrips(similarQuery.data?.pages[0]?.items ?? [], postId);
  if (trips.length === 0) return null;
  return (
    <section aria-labelledby="trip-plan-similar">
      <h2 id="trip-plan-similar" className={styles.sectionHeading}>
        {vi.api.tripPlanSimilarTitle}
      </h2>
      <ul className={styles.similar}>
        {trips.map((similar) => {
          const image = getCover(similar);
          const meta = [
            getDurationLabel(getTripDayCount(similar.tripAttachment)),
            similar.tripAttachment?.estimatedCostPerPerson
              ? t('api.tripPlanCostPerPerson', {
                  price: formatPrice(similar.tripAttachment.estimatedCostPerPerson),
                })
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={similar.id}>
              <Link
                prefetch={false}
                href={`/trip-plans/${encodeURIComponent(similar.id)}`}
                className={styles.similarCard}
              >
                <span className={styles.similarImage}>
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 860px) 100vw, 360px"
                    unoptimized={!isOptimizedImageUrl(image)}
                  />
                </span>
                <span className={styles.similarTitle}>{similar.title}</span>
                {meta && <span className={styles.statLabel}>{meta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TripPlanSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={`${styles.cover} ${styles.skeleton}`} />
      <div className={styles.container}>
        <div className={`${styles.heroCard} ${styles.skeleton} ${styles.skeletonHero}`} />
        {[0, 1, 2].map((index) => (
          <div key={index} className={`${styles.skeletonLine} ${styles.skeleton}`} />
        ))}
      </div>
    </main>
  );
}

function TripPlanNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.notFound}>
        <h1 className={styles.panelTitle}>{vi.api.tripPlanNotFound}</h1>
        <p className={styles.muted}>{vi.api.tripPlanNotFoundHint}</p>
        <Link prefetch={false} href="/inspiration" className={styles.pillLink}>
          {vi.api.tripPlanBackToInspiration}
        </Link>
      </div>
    </main>
  );
}
