import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { OTA_DESTINATIONS } from '@/features/discovery/ota-destinations';
import {
  addStayDays, getStayDateIssue, getStayPriceIssue, getStayToday, isStayDate, isStayInteger,
  MAX_STAY_GUESTS, MAX_STAY_PRICE, MAX_STAY_ROOMS,
} from '@/features/discovery/stay-search-validation';
import styles from '@/features/discovery/hotel-listing.module.css';
import type { StayFilters } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = { title: `${vi.ota.listingTitle} | Tripflix` };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : '';
  };
  const query = read('q').slice(0, 100).trim();
  const requestedPlace = read('placeId');
  const defaultPlace = OTA_DESTINATIONS[0];
  const placeId = /^[a-z0-9-]{1,100}$/i.test(requestedPlace) ? requestedPlace : query ? '' : defaultPlace.id;
  const placeName = query || OTA_DESTINATIONS.find((place) => place.id === placeId)?.name || placeId;
  const today = getStayToday();
  const requestedCheckIn = read('checkIn');
  const requestedCheckOut = read('checkOut');
  let checkIn = isStayDate(requestedCheckIn) && requestedCheckIn >= today ? requestedCheckIn : addStayDays(today, 1);
  let checkOut = getStayDateIssue(checkIn, requestedCheckOut, today) ? addStayDays(checkIn, 2) : requestedCheckOut;
  if (!isStayDate(checkOut)) {
    checkIn = addStayDays(today, 1);
    checkOut = addStayDays(today, 3);
  }
  const initialFilters: Partial<StayFilters> = { placeId, checkIn, checkOut };
  const limits = { adults: MAX_STAY_GUESTS, rooms: MAX_STAY_ROOMS, minStars: 5, stars: 5 } as const;
  for (const key of ['adults', 'rooms', 'minStars', 'stars'] as const) {
    const value = read(key);
    if (isStayInteger(value, 1, limits[key])) initialFilters[key] = String(Number(value));
  }
  const priceMin = read('priceMin');
  const priceMax = read('priceMax');
  const validMin = isStayInteger(priceMin, 0, MAX_STAY_PRICE) ? String(Number(priceMin)) : '';
  const validMax = isStayInteger(priceMax, 0, MAX_STAY_PRICE) ? String(Number(priceMax)) : '';
  if (!getStayPriceIssue(validMin, validMax)) {
    initialFilters.priceMin = validMin;
    initialFilters.priceMax = validMax;
  }
  const sort = read('sort');
  if (sort === 'stars' || sort === 'price_desc') initialFilters.sort = sort;
  return (
    <main id="content" className={`ota-container ${styles.page}`}>
      <header className={styles.banner}>
        <div className={styles.bannerCopy}>
          <p className="eyebrow">{vi.ota.listingEyebrow}</p>
          <h1>{vi.ota.listingTitle}</h1>
          <p>{vi.ota.listingIntro}</p>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.heroPhoto}>
            <Image src="/brand/hotel.jpg" alt="" fill sizes="(max-width: 640px) 75vw, 45vw" />
          </div>
          <div className={styles.tripiSpot}>
            <Image
              src="/brand/tripi-welcome.png"
              alt=""
              width={192}
              height={192}
              sizes="(max-width: 640px) 116px, 180px"
            />
          </div>
        </div>
      </header>
      <LiveSearchScreen
        key={JSON.stringify([placeName, initialFilters])}
        initialQuery={placeName}
        initialFilters={initialFilters}
      />
    </main>
  );
}
