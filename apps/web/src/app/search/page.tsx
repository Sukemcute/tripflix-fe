import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { parseSearchParams } from '@/features/discovery/search-params';
import { isStayInteger, MAX_STAY_GUESTS } from '@/features/discovery/stay-search-validation';
import styles from '@/features/discovery/hotel-listing.module.css';
import banner from '@/features/flights/flights.module.css';
import { vi } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { NOINDEX_ROBOTS } from '@/features/seo/page-metadata';

// Kết quả lọc theo tham số URL: vô số biến thể trùng nội dung, không cho lên kết quả tìm kiếm (TF112).
export const metadata: Metadata = { title: `${vi.ota.listingTitle} | Tripflix`, robots: NOINDEX_ROBOTS };

const bookingSteps = ['Tìm khách sạn', 'Chọn phòng', 'Đặt phòng'];
const stayPhotos = ['/brand/home-stays-ninh-binh.jpg', '/brand/hoian.jpg', '/brand/beach.jpg'];

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
    <main id="content" className={`ota-container ${banner.page} ${styles.page}`}>
      <header className={`${banner.banner} ${styles.banner}`}>
        <div className={`${banner.bannerMedia} ${styles.bannerMedia}`} aria-hidden="true">
          <Image src="/brand/hotel-resort-4k.webp" alt="" fill priority sizes="(min-width: 1800px) 1600px, 100vw" />
        </div>
        <ol className={`${banner.steps} ${styles.bannerSteps}`} aria-label="Các bước đặt phòng">
          {bookingSteps.map((label, index) => (
            <li key={label} aria-current={index === 0 ? 'step' : undefined} title={label}>
              <span aria-hidden="true">{index + 1}</span>
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
        <div className={`${banner.bannerCopy} ${styles.bannerCopy}`}>
          <p className={banner.bannerEyebrow}>{vi.ota.listingEyebrow.toLocaleUpperCase('vi')}</p>
          <h1>{vi.ota.listingTitle}</h1>
          <p className={banner.bannerIntro}>{vi.ota.listingIntro}</p>
        </div>
        <Image
          className={banner.bannerMascot}
          src="/brand/tripi-welcome.png"
          alt=""
          width={240}
          height={240}
          priority
        />
        <div className={`${banner.feature} ${styles.bannerFeature}`}>
          <Link prefetch={false} href="/inspiration" className={`${banner.featureCard} ${styles.bannerFeatureCard}`}>
            <span className={banner.featureHead}>
              <strong>Cảm hứng cho kỳ nghỉ tới</strong>
              <span className={banner.featureArrow} aria-hidden="true">→</span>
            </span>
            <span className={banner.featureBody}>
              <span className={banner.featurePhotos} aria-hidden="true">
                {stayPhotos.map((src) => (
                  <Image key={src} src={src} alt="" width={40} height={40} />
                ))}
              </span>
              <span className={banner.featureText}>
                <b>Khám phá</b>
                Xem gợi ý nơi lưu trú từ cộng đồng Tripflix
              </span>
            </span>
          </Link>
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
