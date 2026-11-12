'use client';
import { useState } from 'react';
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
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';
import { formatPrice } from './trip-card';
import { StayThumbnail } from './stay-thumbnail';
import { SoftStarIcon } from './soft-star-icon';
import { StaySearchIcon } from './stay-search-icon';
import { Pacifico } from 'next/font/google';
import { WashiTape } from './torn-paper';
import styles from './ota-home.module.css';

const handwritingFont = Pacifico({
  subsets: ['vietnamese', 'latin'],
  weight: ['400'],
  display: 'swap',
});

function PreviewSkeleton() {
  return <div className={styles.previewGrid} role="status" aria-label="Đang tải gợi ý">
    {[0, 1, 2].map((key) => <div key={key} className={styles.previewSkeleton} aria-hidden="true" />)}
  </div>;
}

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
    <section className={styles.stayBand} aria-labelledby="home-stays-title">
      {/* Mép xé giấy đón vào dải vé du lịch Tripflix Ticket */}
      <Image className={styles.stayBackdrop} src="/brand/home-stays-ninh-binh.jpg" alt="" fill sizes="100vw" />
      <div className={`ota-container ${styles.stayContent}`}>
        <div className={styles.stayHeader} data-home-banner>
          <div className={styles.stayTicket}>
            {/* Miếng dán washi tape cố định vé trên trang sổ tay */}
            <WashiTape color="coral" angle={-4} className={styles.ticketTape} />
            <div className={styles.stayCopy}>
              <div className={styles.stayInnerFrame}>
                <div className={styles.stayTicketBadge}>
                  <span className={styles.stayTicketStar}>★</span>
                  <span>TRIPFLIX TICKET</span>
                  <span className={styles.stayTicketStar}>★</span>
                </div>
                <h2 id="home-stays-title">{query.data?.items.length ? vi.ota.staysTitle : 'Tìm nơi ở cho chuyến đi sắp tới'}</h2>
                <p>{query.data?.items.length ? vi.ota.staysIntro : 'Chọn điểm đến và ngày lưu trú để kiểm tra phòng.'}</p>
                <div className={styles.stayActionRow}>
                  <Link
                    prefetch={false}
                    className={`ripple-button ${styles.stayAction}`}
                    href={getDestinationHref(destination)}
                    aria-label="Tìm phòng tại điểm đến đã chọn"
                  >
                    <StaySearchIcon name="search" />
                    <span>Tìm phòng tại:</span>
                  </Link>
                  <Link
                    prefetch={false}
                    className={styles.stayDestinationBadge}
                    href={getDestinationHref(destination)}
                    aria-label={`Điểm đến ${destination.name}`}
                  >
                    <span key={destination.id} className={`${handwritingFont.className} ${styles.stayDestinationText}`}>
                      {destination.name}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            <div className={styles.stayScene} aria-hidden="true">
              {OTA_DESTINATIONS.map((place) => (
                <Image
                  key={place.id}
                  className={styles.stayLandscape}
                  data-active={place.id === destination.id || undefined}
                  src={place.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 90vw, 38vw"
                />
              ))}
            </div>
          </div>
          <Image
            className={styles.stayMascot}
            src="/brand/tripi-depart.png"
            alt=""
            width={210}
            height={210}
            sizes="(max-width: 640px) 102px, 210px"
            aria-hidden="true"
          />
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
        {query.isPending && !query.data && <PreviewSkeleton />}
        <div key={destination.id} className={styles.stayGrid} aria-busy={query.isFetching}>
          {!query.isPending && !query.data?.items.length && [
            destination,
            ...OTA_DESTINATIONS.filter((place) => place.id !== destination.id),
          ].map((place) => (
            <article className={styles.hotelCard} key={place.id}>
              <Link prefetch={false} href={getDestinationHref(place)}>
                <div className={styles.hotelPhoto}>
                  <div className="trip-card-photo">
                    <Image src={place.image} alt="" width={640} height={400} />
                  </div>
                </div>
                <div className={styles.hotelInfo}>
                  <p className={styles.stayLocation}>{place.name}</p>
                  <h3>Tìm nơi ở tại {place.name}</h3>
                  <p className={styles.stayPriceRow}><strong>Xem giá theo ngày</strong></p>
                </div>
              </Link>
            </article>
          ))}
          {query.data?.items.map((stay) => (
            <article className={styles.hotelCard} key={stay.hotelId}>
              <Link
                prefetch={false}
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
      {/* Mép xé giấy chuyển tiếp từ dải vé sang vùng phiêu lưu Tripi */}
    </section>
  );
}

function StoryStats({ likes, comments }: { likes?: number; comments?: number }) {
  return (
    <p className={styles.storyStats}>
      <span className={styles.heartReaction}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
        <span className="sr-only">{vi.api.like}: </span>
        {likes ?? <><span aria-hidden="true">—</span><span className="sr-only">Chưa có số liệu</span></>}
      </span>
      <span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9.5L5 18.5Z" />
        </svg>
        <span className="sr-only">{vi.api.comments}: </span>
        {comments ?? <><span aria-hidden="true">—</span><span className="sr-only">Chưa có số liệu</span></>}
      </span>
    </p>
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
        <Link prefetch={false} className={styles.textLink} href="/inspiration">
          {vi.ota.allStories}
        </Link>
      </div>
      {query.isPending && !posts && <PreviewSkeleton />}
      <div className={styles.previewGrid}>
        {!query.isPending && !posts?.length && OTA_DESTINATIONS.map((place) => (
          <article className={styles.story} key={place.id}>
            <p className="pin-tag">Gợi ý hành trình</p>
            <h3>
              <Link prefetch={false} href={`/inspiration?q=${encodeURIComponent(place.name)}`}>
                Một hành trình ở {place.name}
              </Link>
            </h3>
            <p className={styles.excerpt}>Khám phá chia sẻ từ cộng đồng Tripflix.</p>
            <StoryStats />
          </article>
        ))}
        {posts?.map((post) => (
          <article className={styles.story} key={post.id}>
            <p className="pin-tag">{post.tripAttachment?.destinationName ?? vi.ota.story}</p>
            <h3>
              <Link prefetch={false} href={`/trips/${encodeURIComponent(post.id)}`}>{post.title}</Link>
            </h3>
            <p className={styles.excerpt}>{post.body}</p>
            <StoryStats likes={post.reactionTotal} comments={post.commentCount} />
          </article>
        ))}
      </div>
      {/* Mép xé giấy chuyển tiếp êm dịu từ câu chuyện du lịch vào chân trang Footer */}
    </section>
  );
}
