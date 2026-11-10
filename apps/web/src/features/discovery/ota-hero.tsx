'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import styles from './ota-hero.module.css';

const ACTIVITIES = [
  ['home-shore.jpg', vi.api.otaActivities.beach],
  ['home-surf.jpg', vi.api.otaActivities.surf],
  ['home-kayaking.jpg', vi.api.otaActivities.kayak],
] as const;

/**
 * 8 Frame chữ cái TRIPFLIX độc lập theo chuẩn Figma Component System:
 * Mỗi chữ cái là một Frame/Vector riêng biệt lồng một bức ảnh danh thắng thực tế,
 * có khối 3D extrusion, viền neon cyan phát sáng và tooltip định danh tương tác.
 */
const TRIPFLIX_BRAND_LETTERS = [
  {
    char: 'T',
    tag: 'Tây Bắc',
    destination: 'Sa Pa • Mù Cang Chải',
    image: '/brand/destinations/lao-cai-spotlight.jpg',
    position: 'center 45%',
    query: 'Lào Cai',
  },
  {
    char: 'R',
    tag: 'Kỳ quan',
    destination: 'Vịnh Hạ Long',
    image: '/brand/destinations/quang-ninh-spotlight.jpg',
    position: 'center 50%',
    query: 'Quảng Ninh',
  },
  {
    char: 'I',
    tag: 'Non nước',
    destination: 'Tràng An • Ninh Bình',
    image: '/brand/destinations/ninh-binh-spotlight.jpg',
    position: 'center 62%',
    query: 'Ninh Bình',
  },
  {
    char: 'P',
    tag: 'Cố đô',
    destination: 'Huế • Cổng Tam Quan',
    image: '/brand/destinations/hue-spotlight.jpg',
    position: 'center 50%',
    query: 'Huế',
  },
  {
    char: 'F',
    tag: 'Biển xanh',
    destination: 'Đảo Ngọc Phú Quốc',
    image: '/brand/destinations/phu-quoc-spotlight.jpg',
    position: 'center 50%',
    query: 'Phú Quốc',
  },
  {
    char: 'L',
    tag: 'Danh thác',
    destination: 'Thác Bản Giốc • Cao Bằng',
    image: '/brand/destinations/cao-bang-spotlight.jpg',
    position: 'center 50%',
    query: 'Cao Bằng',
  },
  {
    char: 'I',
    tag: 'Đà Nẵng',
    destination: 'Cầu Vàng Bà Nà',
    image: '/brand/destinations/da-lat-spotlight.jpg',
    position: 'center 68%',
    query: 'Đà Nẵng',
  },
  {
    char: 'X',
    tag: 'Di sản',
    destination: 'Phố cổ Hội An',
    image: '/brand/destinations/hoi-an-spotlight.jpg',
    position: 'center 50%',
    query: 'Hội An',
  },
] as const;

const HERO_SCENES = [
  {
    id: 'ha-long',
    image: '/brand/home-kayak-source.jpg',
    title: vi.ota.heroScenes.haLong.title,
    subtitle: vi.ota.heroScenes.haLong.subtitle,
    badge: vi.ota.heroScenes.haLong.badge,
    rating: '4.9 ★',
    href: '/search?q=Quảng+Ninh',
  },
  {
    id: 'hoi-an',
    image: '/brand/home-hoi-an-lanterns.jpg',
    title: vi.ota.heroScenes.hoiAn.title,
    subtitle: vi.ota.heroScenes.hoiAn.subtitle,
    badge: vi.ota.heroScenes.hoiAn.badge,
    rating: '4.8 ★',
    href: '/search?q=Hội+An',
  },
  {
    id: 'phu-quoc',
    image: '/brand/destinations/phu-quoc-spotlight.jpg',
    title: vi.ota.heroScenes.phuQuoc.title,
    subtitle: vi.ota.heroScenes.phuQuoc.subtitle,
    badge: vi.ota.heroScenes.phuQuoc.badge,
    rating: '4.9 ★',
    href: '/search?q=Phú+Quốc',
  },
  {
    id: 'ninh-binh',
    image: '/brand/home-stays-ninh-binh.jpg',
    title: vi.ota.heroScenes.ninhBinh.title,
    subtitle: vi.ota.heroScenes.ninhBinh.subtitle,
    badge: vi.ota.heroScenes.ninhBinh.badge,
    rating: '4.9 ★',
    href: '/search?q=Ninh+Bình',
  },
] as const;

const [SLOGAN_FIRST, SLOGAN_SECOND] = vi.app.slogan.split(', ');
const HERO_INTERVAL_MS = 5500;

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
    <header className={styles.hero}>
      {/* Layer 1: Không gian đại dương nhiệt đới, núi đá vôi Vịnh Hạ Long & chim hải âu */}
      <div className={styles.karstBackdrop} aria-hidden="true">
        <div className={styles.sunRays} />
        <svg className={`${styles.seagull} ${styles.gull1}`} viewBox="0 0 24 12">
          <path d="M0,8 C6,2 10,2 12,6 C14,2 18,2 24,8 C18,6 14,8 12,12 C10,8 6,6 0,8 Z" />
        </svg>
        <svg className={`${styles.seagull} ${styles.gull2}`} viewBox="0 0 24 12">
          <path d="M0,8 C6,2 10,2 12,6 C14,2 18,2 24,8 C18,6 14,8 12,12 C10,8 6,6 0,8 Z" />
        </svg>

        {/* Dãy núi đá vôi Vịnh Hạ Long tạo chiều sâu không gian kỳ vĩ */}
        <svg className={styles.karstSvg} viewBox="0 0 1440 280" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="farKarstGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="midKarstGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#047857" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="nearKarstGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#065f46" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#083344" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Núi đá xa chân trời */}
          <path d="M-20 280 L-20 160 Q 90 90 220 140 T 520 110 T 800 135 T 1100 95 T 1320 130 T 1460 150 L 1460 280 Z" fill="url(#farKarstGrad)" />

          {/* Đảo đá vôi bên trái */}
          <path d="M -20 280 L -20 100 Q 25 50 65 75 Q 95 95 115 150 Q 135 200 165 280 Z" fill="url(#midKarstGrad)" />
          <path d="M 30 280 L 45 130 Q 80 85 110 115 Q 135 150 150 280 Z" fill="url(#nearKarstGrad)" />

          {/* Đảo đá vôi bên phải */}
          <path d="M 1260 280 Q 1295 160 1325 120 Q 1365 70 1405 100 Q 1440 125 1460 280 Z" fill="url(#midKarstGrad)" />
          <path d="M 1350 280 Q 1380 140 1410 105 Q 1435 80 1460 118 L 1460 280 Z" fill="url(#nearKarstGrad)" />
        </svg>
      </div>

      <div className={`ota-container ${styles.inner}`}>
        {/* Layer 2: Figma-style Modular 3D Typography Canvas (Từng chữ cái là 1 frame độc lập lồng ảnh) */}
        <div className={styles.brandCanvasWrapper}>
          <div className={styles.tripflixBrandCanvas}>
            {TRIPFLIX_BRAND_LETTERS.map((item, idx) => (
              <Link
                prefetch={false}
                href={`/search?q=${encodeURIComponent(item.query)}`}
                className={styles.letterFrame}
                key={`${item.char}-${idx}`}
                title={`${item.char} — ${item.destination}`}
              >
                {/* Khối hộp 3D Isometric Extrusion đa tầng */}
                <span className={styles.letter3dExtrusion} aria-hidden="true">{item.char}</span>
                {/* Mặt chữ vector lồng ảnh thực tế danh thắng */}
                <span
                  className={styles.letterFace}
                  style={{
                    backgroundImage: `url('${item.image}')`,
                    backgroundPosition: item.position,
                  }}
                >
                  {item.char}
                </span>
                {/* Tooltip định danh danh lam thắng cảnh khi hover */}
                <span className={styles.letterBadge}>
                  <span className={styles.badgeTag}>{item.tag}</span>
                  <strong className={styles.badgeName}>{item.destination}</strong>
                </span>
              </Link>
            ))}
          </div>

          {/* Layer 3: Con thuyền gỗ truyền thống & Bọt sóng nước êm dịu quanh thuyền */}
          <div className={styles.boatWakeGroup} aria-hidden="true">
            <Image
              src="/brand/hero-boat.png"
              alt=""
              width={140}
              height={90}
              className={styles.heroBoat}
              priority
            />
            <svg className={styles.wakeWaterSvg} viewBox="0 0 160 48" fill="none">
              <defs>
                <filter id="boatFoamBlur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
                <radialGradient id="boatHullFoam" cx="65%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#bae6fd" stopOpacity="0.55" />
                  <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Bọt sóng nước ôm tròn chân mạn thuyền */}
              <ellipse cx="100" cy="24" rx="55" ry="14" fill="url(#boatHullFoam)" />
              <ellipse cx="50" cy="28" rx="35" ry="9" fill="rgba(255, 255, 255, 0.45)" filter="url(#boatFoamBlur)" />
            </svg>
          </div>
        </div>

        {/* Layer 4: Bố cục 2 cột nửa dưới mặt biển */}
        <div className={styles.bottomSection}>
          <div className={styles.copy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowText}>{vi.ota.heroEyebrow}</span>
              <span className={styles.eyebrowPlane} aria-hidden="true">→</span>
            </div>

            <h1>
              <span className={styles.titleFirst}>{SLOGAN_FIRST},</span>{' '}
              <span className={styles.titleSecond}>{SLOGAN_SECOND}.</span>
            </h1>

            <p className={styles.description}>{vi.ota.heroIntro}</p>

            <div className={styles.actions}>
              <a href="#ota-search" className={styles.primaryCta}>
                <span>{vi.ota.heroStartExploring}</span>
                <span className={styles.ctaArrow} aria-hidden="true">→</span>
              </a>

              <nav className={styles.activities} aria-label={vi.api.otaActivityLabel}>
                {ACTIVITIES.map(([image, name]) => (
                  <Link
                    prefetch={false}
                    key={image}
                    href={{ pathname: '/inspiration', query: { q: name } }}
                    className={styles.activityPill}
                  >
                    <Image src={`/brand/${image}`} alt="" width={24} height={24} />
                    <span>{name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <aside className={styles.sceneContainer}>
            {/* Thẻ nổi kính mờ danh lam thắng cảnh lồng ảnh thực tế */}
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
    </header>
  );
}
