import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import { TornPaperDivider } from './torn-paper';
import styles from './ota-hero.module.css';

/**
 * 8 Điểm tương tác trên chữ cái TRIPFLIX (Figma Hotspot System):
 * Tương ứng 8 chữ cái T - R - I - P - F - L - I - X trên mặt chữ lồng toàn cảnh Việt Nam.
 * Hover hiển thị Tooltip Badge định danh danh lam thắng cảnh, Click dẫn tới trang tìm kiếm.
 */
const TRIPFLIX_BRAND_LETTERS = [
  {
    char: 'T',
    tag: 'Tây Bắc',
    destination: 'Sa Pa • Mù Cang Chải',
    query: 'Lào Cai',
  },
  {
    char: 'R',
    tag: 'Kỳ quan',
    destination: 'Vịnh Hạ Long',
    query: 'Quảng Ninh',
  },
  {
    char: 'I',
    tag: 'Non nước',
    destination: 'Tràng An • Ninh Bình',
    query: 'Ninh Bình',
  },
  {
    char: 'P',
    tag: 'Cố đô',
    destination: 'Huế • Cổng Tam Quan',
    query: 'Huế',
  },
  {
    char: 'F',
    tag: 'Biển xanh',
    destination: 'Đảo Ngọc Phú Quốc',
    query: 'Phú Quốc',
  },
  {
    char: 'L',
    tag: 'Danh thác',
    destination: 'Thác Bản Giốc • Cao Bằng',
    query: 'Cao Bằng',
  },
  {
    char: 'I',
    tag: 'Đà Nẵng',
    destination: 'Cầu Vàng Bà Nà',
    query: 'Đà Nẵng',
  },
  {
    char: 'X',
    tag: 'Di sản',
    destination: 'Phố cổ Hội An',
    query: 'Hội An',
  },
] as const;

const [SLOGAN_FIRST, SLOGAN_SECOND] = vi.app.slogan.split(', ');

export function OtaHero() {
  return (
    <header className={styles.hero} data-home-banner data-home-hero>
      <div className={styles.backdropImageWrapper} data-hero-layer="scenery" aria-hidden="true">
        <picture>
          <source media="(max-width: 640px)" srcSet="/brand/hero-layered-v1/ha-long-960.webp" />
          <Image
            src="/brand/hero-layered-v1/ha-long-1600.webp"
            alt=""
            fill
            fetchPriority="high"
            loading="eager"
            unoptimized
            className={styles.backdropImg}
          />
        </picture>
      </div>

      <div className={styles.typographyLayer} data-hero-layer="typography">
        <picture>
          <source media="(max-width: 640px)" srcSet="/brand/hero-layered-v1/tripflix-logo-crystal-760.webp" />
          <Image
            src="/brand/hero-layered-v1/tripflix-logo-crystal-1600.webp"
            alt="Tripflix, tám miền di sản Việt Nam"
            width={1600}
            height={440}
            loading="eager"
            unoptimized
            className={styles.typographyImage}
          />
        </picture>
        <nav className={styles.letterHotspotsArea} aria-label="Khám phá danh thắng qua từng chữ cái">
          <div className={styles.letterHotspots}>
            {TRIPFLIX_BRAND_LETTERS.map((item, idx) => (
              <Link
                prefetch={false}
                href={`/search?q=${encodeURIComponent(item.query)}`}
                className={styles.letterHotspot}
                key={`${item.char}-${idx}`}
                aria-label={`${item.char} - ${item.destination}`}
                title={`${item.char} - ${item.destination}`}
              >
                <span className={styles.letterBadge}>
                  <span className={styles.badgeTag}>{item.tag}</span>
                  <strong className={styles.badgeName}>{item.destination}</strong>
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <div className={styles.rowerLayer} data-hero-layer="rower" aria-hidden="true">
        <Image
          src="/brand/hero-layered-v1/tripi-rowing.webp"
          alt=""
          width={560}
          height={565}
          unoptimized
          loading="eager"
          fetchPriority="low"
          className={styles.rowerImage}
        />
      </div>

      <div className={styles.vectorLayer} data-hero-layer="vectors" aria-hidden="true">
        <Image src="/brand/hero-layered-v1/seagulls-ribbon.svg?v=2" alt="" fill unoptimized loading="eager" />
      </div>

      <div className={`ota-container ${styles.inner}`} data-hero-layer="ui">
        <div className={styles.bottomSection}>
          <div className={styles.copy}>
            <h1>
              <span className={styles.titleFirst}>{SLOGAN_FIRST},</span>{' '}
              <span className={styles.titleSecond}>{SLOGAN_SECOND}</span>
            </h1>
            <div className={styles.appDownload}>
              <p>Sắp có mặt trên điện thoại</p>
              <div className={styles.storeBadges} aria-label="Tải ứng dụng Tripflix">
                <Link
                  prefetch={false}
                  href="/coming-soon"
                  className={styles.storeBadge}
                  aria-label="Tải Tripflix trên App Store — sắp ra mắt"
                >
                  <svg className={styles.appleIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M16.37 12.64c.02 2.1 1.84 2.8 1.86 2.81-.02.05-.29 1.01-.96 2-.58.86-1.18 1.71-2.13 1.73-.93.02-1.23-.56-2.29-.56s-1.4.54-2.28.58c-.91.03-1.6-.93-2.18-1.78-1.19-1.72-2.1-4.86-.88-6.98.6-1.05 1.67-1.71 2.82-1.73.88-.02 1.71.6 2.29.6.58 0 1.57-.74 2.65-.63.45.02 1.71.18 2.52 1.36-.07.04-1.5.88-1.49 2.6ZM14.63 6.9c.48-.58.81-1.38.72-2.18-.69.03-1.53.46-2.03 1.04-.45.52-.84 1.33-.73 2.11.77.06 1.56-.39 2.04-.97Z"
                    />
                  </svg>
                  <span className={styles.storeBadgeCopy}>
                    <small>Download on the</small>
                    <strong>App Store</strong>
                  </span>
                </Link>
                <Link
                  prefetch={false}
                  href="/coming-soon"
                  className={styles.storeBadge}
                  aria-label="Tải Tripflix trên Google Play — sắp ra mắt"
                >
                  <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#34A853" d="M2.4 1.2v21.6L13.7 12z" />
                    <path fill="#4285F4" d="m2.4 1.2 13.2 7.9L19 5.8c.7-.5.5-1.2-.1-1.5L5.1.5c-1.2-.5-2.2-.2-2.7.7Z" />
                    <path fill="#FBBC04" d="m15.6 14.9-13.2 7.9c.5.9 1.5 1.2 2.7.7L19 17.7c.6-.3.8-1 .1-1.5z" />
                    <path fill="#EA4335" d="m19 5.8-3.4 2 4.1 2.5c1.2.7 1.2 1.7 0 2.4l-4.1 2.4 3.4 2 3.1-1.8c2.2-1.3 2.2-3.4 0-4.7z" />
                  </svg>
                  <span className={styles.storeBadgeCopy}>
                    <small>GET IT ON</small>
                    <strong>Google Play</strong>
                  </span>
                </Link>
                <Link
                  prefetch={false}
                  href="/coming-soon"
                  className={`${styles.storeBadge} ${styles.downloadBadge}`}
                  aria-label="Tải ứng dụng Tripflix miễn phí — sắp ra mắt"
                >
                  <svg className={styles.downloadIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1.3 4.6v6.1l2-2 1.5 1.5-4.8 4.8-4.8-4.8 1.5-1.5 2 2V6.6h2.6ZM7.5 18h9v1.8h-9z" />
                  </svg>
                  <span className={styles.storeBadgeCopy}>
                    <small>GET FOR FREE</small>
                    <strong>Download</strong>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mép xé giấy đại dương chuyển tiếp mượt mà xuống thanh tìm kiếm và thân trang */}
      <TornPaperDivider variant="hero-to-canvas" />
    </header>
  );
}
