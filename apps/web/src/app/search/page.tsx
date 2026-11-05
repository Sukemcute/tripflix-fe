import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { OTA_DESTINATIONS } from '@/features/discovery/ota-destinations';
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
  const initialFilters: Partial<StayFilters> = { placeId };
  for (const key of ['checkIn', 'checkOut'] as const) {
    const value = read(key);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) initialFilters[key] = value;
  }
  for (const key of ['adults', 'rooms', 'minStars', 'priceMin', 'priceMax'] as const) {
    const value = read(key);
    if (/^\d{1,10}$/.test(value)) initialFilters[key] = value;
  }
  if (read('sort') === 'stars') initialFilters.sort = 'stars';
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
