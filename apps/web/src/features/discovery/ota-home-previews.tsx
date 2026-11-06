'use client';
import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAvailableStays,
  getFutureDate,
  useApiSession,
  useSocialPosts,
  type StayFilters,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';
import { formatPrice } from './trip-card';
import { StayThumbnail } from './stay-thumbnail';
import { SoftStarIcon } from './soft-star-icon';
import styles from './ota-home.module.css';

export function HomeStayPreview() {
  const { isReady } = useApiSession();
  const [destination, setDestination] = useState<(typeof OTA_DESTINATIONS)[number]>(OTA_DESTINATIONS[0]);
  const [dates] = useState(() => ({ checkIn: getFutureDate(1), checkOut: getFutureDate(3) }));
  const filters: StayFilters = {
    ...dates,
    placeId: destination.id,
    adults: '2',
    rooms: '',
    minStars: '',
    priceMin: '',
    priceMax: '',
    sort: 'stars',
  };
  const query = useQuery({
    queryKey: ['discovery', 'home-stays', filters],
    enabled: isReady,
    queryFn: ({ signal }) => getAvailableStays(filters, { signal, limit: 3 }),
  });
  return (
    <section className={styles.stayBand} aria-labelledby="home-stays-title" data-home-reveal>
      <div className={`ota-container ${styles.stayContent}`}>
        <div
          className={styles.stayHeader}
          data-home-banner
          style={{ '--stay-photo': `url(${destination.image})` } as CSSProperties}
        >
          <div className={styles.stayCopy}>
            <h2 id="home-stays-title">{vi.ota.staysTitle}</h2>
            <p>{vi.ota.staysIntro}</p>
            <Link className={`ripple-button ${styles.stayAction}`} href={getDestinationHref(destination)}>
              {t('ota.browseDestination', { name: destination.name })}
            </Link>
          </div>
          <div className={styles.stayScene} aria-hidden="true">
            <Image
              key={destination.id}
              className={styles.stayLandscape}
              src={destination.image}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 38vw"
            />
            <Image
              className={styles.stayMascot}
              src="/brand/tripi-depart.png"
              alt=""
              width={210}
              height={210}
              sizes="(max-width: 640px) 102px, 210px"
            />
          </div>
        </div>
        <fieldset className={styles.chips} aria-label={vi.api.destination}>
          {OTA_DESTINATIONS.map((place) => (
            <button
              type="button"
              key={place.id}
              aria-pressed={place.id === destination.id}
              onClick={() => setDestination(place)}
            >
              {place.name}
            </button>
          ))}
        </fieldset>
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {query.isPending && <output className={styles.state}>{vi.api.loading}</output>}
        {query.data?.items.length === 0 && (
          <p className={styles.state}>
            {vi.ota.noMatchingStays}. {vi.ota.noStaysHint}
          </p>
        )}
        <div className={styles.stayGrid}>
          {query.data?.items.map((stay) => (
            <article className={styles.hotelCard} key={stay.hotelId}>
              <Link
                href={{
                  pathname: `/hotels/${encodeURIComponent(stay.hotelId)}`,
                  query: { ...dates, adults: 2 },
                }}
              >
                <div className={styles.hotelPhoto}>
                  <StayThumbnail url={stay.thumbnail} name={stay.name} />
                </div>
                <div className={styles.hotelInfo}>
                  <p className={styles.stayLocation}>{stay.province.name}</p>
                  {stay.stars ? (
                    <p className={`pin-tag ${styles.stayRating}`}>
                      <span aria-hidden="true">{stay.stars}</span>
                      <SoftStarIcon />
                      <span className="sr-only">{t('ota.starsExact', { count: stay.stars })}</span>
                    </p>
                  ) : null}
                  <h3>{stay.name}</h3>
                  <p className={styles.stayPriceRow}>
                    <strong>{formatPrice(stay.unitPrice)}</strong> <small>{vi.hotel.perNight}</small>
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeStoryPreview() {
  const query = useSocialPosts();
  const posts = query.data?.pages[0]?.items.slice(0, 3);
  return (
    <section
      className={`ota-container ${styles.section} ${styles.stories}`}
      aria-labelledby="home-stories-title"
      data-home-reveal
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="home-stories-title">{vi.ota.storiesTitle}</h2>
          <p>{vi.ota.storiesIntro}</p>
        </div>
        <Link className={styles.textLink} href="/inspiration">
          {vi.ota.allStories}
        </Link>
      </div>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output className={styles.state}>{vi.api.loading}</output>}
      {posts?.length === 0 && <p className={styles.state}>{vi.api.noPosts}</p>}
      <div className={styles.previewGrid}>
        {posts?.map((post) => (
          <article className={styles.story} key={post.id}>
            <p className="pin-tag">{post.tripAttachment?.destinationName ?? vi.ota.story}</p>
            <h3>
              <Link href={`/trips/${encodeURIComponent(post.id)}`}>{post.title}</Link>
            </h3>
            <p className={styles.excerpt}>{post.body}</p>
            <p className={styles.storyStats}>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
                </svg>
                {post.reactionTotal}
                <span className="sr-only"> {vi.api.like}</span>
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9.5L5 18.5Z" />
                </svg>
                {post.commentCount}
                <span className="sr-only"> {vi.api.comments}</span>
              </span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
