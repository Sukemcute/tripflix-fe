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

            <p className={styles.description}>{vi.ota.heroIntro}</p>
          </div>
        </div>
      </div>

      {/* Mép xé giấy đại dương chuyển tiếp mượt mà xuống thanh tìm kiếm và thân trang */}
      <TornPaperDivider variant="hero-to-canvas" />
    </header>
  );
}
