import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { parseSearchParams } from '@/features/discovery/search-params';
import { isStayInteger, MAX_STAY_GUESTS } from '@/features/discovery/stay-search-validation';
import styles from '@/features/discovery/hotel-listing.module.css';
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
  const { placeName, initialFilters } = parseSearchParams(read);
  // Trẻ em, em bé chỉ để mang sang trang khách sạn; tổng khách tối đa 9 như ô chọn khách.
  const readCount = (key: string) => (isStayInteger(read(key), 0, MAX_STAY_GUESTS) ? Number(read(key)) : 0);
  const initialGuests = { children: readCount('children'), infants: readCount('infants') };
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
        initialGuests={initialGuests}
        initialQuery={placeName}
        initialFilters={initialFilters}
      />
    </main>
  );
}
