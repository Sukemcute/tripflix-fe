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

      {/* Layer 2: Gợn sóng nước biển khúc xạ nắng (Water ripples & Caustics) */}
      <div className={styles.waterRippleLayer} aria-hidden="true">
        <svg className={styles.waterWavesSvg} viewBox="0 0 1440 240" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="30%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(3, 105, 161, 0)" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(186, 230, 253, 0.5)" />
              <stop offset="50%" stopColor="rgba(14, 165, 233, 0.15)" />
              <stop offset="100%" stopColor="rgba(2, 68, 100, 0)" />
            </linearGradient>
            <linearGradient id="causticGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="25%" stopColor="rgba(255, 255, 255, 0.6)" />
              <stop offset="50%" stopColor="rgba(125, 211, 252, 0.75)" />
              <stop offset="75%" stopColor="rgba(255, 255, 255, 0.6)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          {/* Lớp sóng gợn xa 1 */}
          <path d="M 0 60 Q 180 45, 360 60 T 720 55 T 1080 62 T 1440 58 L 1440 240 L 0 240 Z" fill="url(#waveGrad1)" />
          <path d="M 0 58 Q 180 43, 360 58 T 720 53 T 1080 60 T 1440 56" stroke="url(#causticGlow)" strokeWidth="1.8" />

          {/* Lớp sóng gợn trung 2 */}
          <path d="M 0 110 Q 240 92, 480 110 T 960 105 T 1440 112 L 1440 240 L 0 240 Z" fill="url(#waveGrad2)" />
          <path d="M 0 108 Q 240 90, 480 108 T 960 103 T 1440 110" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />

          {/* Lớp sóng gợn tiền cảnh 3 */}
          <path d="M 0 165 Q 220 150, 440 165 T 880 160 T 1320 168 T 1440 162" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.5" />
          <path d="M 0 195 Q 260 182, 520 195 T 1040 190 T 1440 198" stroke="rgba(125, 211, 252, 0.3)" strokeWidth="1.2" />
        </svg>
      </div>

      <div className={`ota-container ${styles.inner}`}>
        {/* Layer 3: Figma-style Upright Vector Typography Masking (Chữ đứng thẳng lồng toàn cảnh Việt Nam) */}
        <div className={styles.brandCanvasWrapper}>
          <svg className={styles.uprightTripflixSvg} viewBox="0 0 940 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="svg3dShadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#012437" floodOpacity="0.75" />
              </filter>

              {/* ClipPath: Chữ TRIPFLIX ĐỨNG THẲNG (Upright), không nghiêng đổ, không biến dạng */}
              <clipPath id="uprightTripflixMask">
                <text x="470" y="112" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="114" letterSpacing="4">
                  TRIPFLIX
                </text>
              </clipPath>
            </defs>

            {/* KHỐI ĐỘ DÀY 3D ĐỨNG THẲNG (UPRIGHT EXTRUSION) */}
            <text x="470" y="122" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="114" letterSpacing="4" fill="#012638" filter="url(#svg3dShadow)">
              TRIPFLIX
            </text>
            <text x="470" y="119" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="114" letterSpacing="4" fill="#03486a">
              TRIPFLIX
            </text>
            <text x="470" y="116" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="114" letterSpacing="4" fill="#0284c7">
              TRIPFLIX
            </text>

            {/* TOÀN CẢNH DANH THẮNG VIỆT NAM LIÊN TỤC LỒNG TRỌN VẸN VÀO CHỮ */}
            <image href="/brand/vietnam-panorama-tripflix.jpg" x="20" y="0" width="900" height="135" preserveAspectRatio="none" clipPath="url(#uprightTripflixMask)" />

            {/* ĐƯỜNG VIỀN KÍNH PHA LÊ TRẮNG TINH KHIẾT (KHÔNG BỊ CẮT VÀO ẢNH) */}
            <text x="470" y="112" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="114" letterSpacing="4" fill="none" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="2" pointerEvents="none">
              TRIPFLIX
            </text>
          </svg>

          {/* LỚP TƯƠNG TÁC TỪNG CHỮ CÁI (FIGMA HOTSPOTS) */}
          <div className={styles.letterHotspots} aria-label="Khám phá danh thắng qua từng chữ cái">
            {TRIPFLIX_BRAND_LETTERS.map((item, idx) => (
              <Link
                prefetch={false}
                href={`/search?q=${encodeURIComponent(item.query)}`}
                className={styles.letterHotspot}
                key={`${item.char}-${idx}`}
                title={`${item.char} — ${item.destination}`}
              >
                <span className={styles.letterBadge}>
                  <span className={styles.badgeTag}>{item.tag}</span>
                  <strong className={styles.badgeName}>{item.destination}</strong>
                </span>
              </Link>
            ))}
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
