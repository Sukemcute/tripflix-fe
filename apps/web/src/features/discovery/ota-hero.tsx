'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import { TripiLive } from '@/features/mascot/tripi-live';
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

const HERO_SCENES = [
  {
    id: 'hoi-an',
    image: '/brand/home-hoi-an-lanterns-night.jpg',
    title: 'Phố cổ Hội An',
    subtitle: 'Đêm hoa đăng lung linh sắc màu',
    badge: 'DI SẢN UNESCO',
    rating: '★ 4.8',
    href: '/search?q=Hội+An',
  },
  {
    id: 'ha-long',
    image: '/brand/home-kayak-source.jpg',
    title: vi.ota.heroScenes.haLong.title,
    subtitle: vi.ota.heroScenes.haLong.subtitle,
    badge: vi.ota.heroScenes.haLong.badge,
    rating: '★ 4.9',
    href: '/search?q=Quảng+Ninh',
  },
  {
    id: 'phu-quoc',
    image: '/brand/destinations/phu-quoc-spotlight.jpg',
    title: vi.ota.heroScenes.phuQuoc.title,
    subtitle: vi.ota.heroScenes.phuQuoc.subtitle,
    badge: vi.ota.heroScenes.phuQuoc.badge,
    rating: '★ 4.9',
    href: '/search?q=Phú+Quốc',
  },
] as const;

const [SLOGAN_FIRST, SLOGAN_SECOND] = vi.app.slogan.split(', ');
const HERO_INTERVAL_MS = 6000;

export function OtaHero() {
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextScene = useCallback(() => {
    setActiveScene((prev) => (prev + 1) % HERO_SCENES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextScene, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, nextScene]);

  const current = HERO_SCENES[activeScene]!;

  return (
    <header className={styles.hero} data-home-banner>
      <div className={styles.backdropImageWrapper} data-hero-layer="scenery" aria-hidden="true">
        <Image
          src="/brand/hero-layered-v1/ha-long-clean.webp"
          alt=""
          fill
          preload
          unoptimized
          sizes="100vw"
          className={styles.backdropImg}
        />
      </div>

      <div className={styles.typographyLayer} data-hero-layer="typography">
        <Image
          src="/brand/hero-layered-v1/tripflix-logo-crystal.svg"
          alt="Tripflix, tám miền di sản Việt Nam"
          width={2400}
          height={660}
          preload
          unoptimized
          className={styles.typographyImage}
        />
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

      <div className={styles.boatLayer} data-hero-layer="boat" aria-hidden="true">
        <Image
          src="/brand/hero-layered-v1/boat-wake.webp"
          alt=""
          width={1774}
          height={887}
          unoptimized
          loading="eager"
          sizes="(max-width: 640px) 70vw, 46vw"
          className={styles.boatImage}
        />
      </div>

      <div className={styles.vectorLayer} data-hero-layer="vectors" aria-hidden="true">
        <Image src="/brand/hero-layered-v1/seagulls-ribbon.svg?v=2" alt="" fill unoptimized loading="eager" />
      </div>

      <div className={styles.mascotLayer} aria-hidden="true">
        <TripiLive className={styles.mascotImage} interactive={false} />
      </div>

      <div className={`ota-container ${styles.inner}`} data-hero-layer="ui">
        {/* Bố cục 2 cột nửa dưới mặt biển */}
        <div className={styles.bottomSection}>
          <div className={styles.copy}>
            <h1>
              <span className={styles.titleFirst}>{SLOGAN_FIRST},</span>{' '}
              <span className={styles.titleSecond}>{SLOGAN_SECOND}</span>
            </h1>

            <p className={styles.description}>{vi.ota.heroIntro}</p>

          </div>

          <aside className={styles.sceneContainer}>
            {/* Thẻ nổi kính mờ danh lam thắng cảnh lồng ảnh thực tế (Phố cổ Hội An) */}
            <div
              className={styles.panoramicDestinationCard}
              onPointerEnter={() => setIsPaused(true)}
              onPointerLeave={() => setIsPaused(false)}
            >
              <div className={styles.destinationCardInfo}>
                <div className={styles.destinationCardHead}>
                  <span className={styles.destinationBadge}>{current.badge}</span>
                  <span className={styles.destinationRating}>{current.rating}</span>
                </div>
                <strong className={styles.destinationTitle}>{current.title}</strong>
                <p className={styles.destinationSubtitle}>{current.subtitle}</p>
                <Link prefetch={false} href={current.href} className={styles.destinationAction}>
                  <span>{vi.ota.heroExploreNow}</span>
                  <span className={styles.actionArrow} aria-hidden="true">→</span>
                </Link>
              </div>

              <div className={styles.destinationCardThumb}>
                <Image
                  src={current.image}
                  alt={current.title}
                  fill
                  sizes="(max-width: 640px) 100px, 190px"
                  className={styles.cardThumbImg}
                />
              </div>
            </div>

            {/* Thanh điều hướng chấm scene */}
            <nav className={styles.sceneControls} aria-label={vi.ota.discover}>
              {HERO_SCENES.map((scene, idx) => (
                <button
                  type="button"
                  key={scene.id}
                  className={`${styles.sceneDot} ${idx === activeScene ? styles.sceneDotActive : ''}`}
                  onClick={() => setActiveScene(idx)}
                  aria-label={`${scene.title}`}
                  aria-current={idx === activeScene ? 'true' : undefined}
                >
                  {idx === activeScene ? (
                    <span
                      key={activeScene}
                      className={styles.sceneProgressFill}
                      style={{ animationDuration: `${HERO_INTERVAL_MS}ms` }}
                    />
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      </div>

      {/* Mép xé giấy đại dương chuyển tiếp mượt mà xuống thanh tìm kiếm và thân trang */}
      <TornPaperDivider variant="hero-to-canvas" />
    </header>
  );
}
