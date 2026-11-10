'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import { TripiLive } from '@/features/mascot/tripi-live';
import styles from './ota-hero.module.css';

const ACTIVITIES = [
  ['home-shore.jpg', vi.api.otaActivities.beach],
  ['home-surf.jpg', vi.api.otaActivities.surf],
  ['home-kayaking.jpg', vi.api.otaActivities.kayak],
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

// Tách khẩu hiệu thành 2 dòng cố định: "Chạm cảm hứng," (đen, không xuống dòng) và "trọn hành trình".
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
      {/* Lớp nền nghệ thuật đại dương: chữ chìm khổng lồ, đường contour sóng biển, tia nắng khúc xạ & cụm chấm bi */}
      <div className={styles.backdropArt} aria-hidden="true">
        <div className={styles.watermarkWord}>VIETNAM</div>
        <div className={styles.sunRays} />

        <svg className={styles.oceanicContours} viewBox="0 0 1440 600" fill="none">
          {/* Các đường contour sóng biển uốn lượn mờ ảo */}
          <path
            d="M -100 280 C 220 220 380 340 680 260 S 1100 180 1540 240"
            stroke="rgba(78, 227, 210, 0.14)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <path
            d="M -60 360 C 260 300 440 420 740 350 S 1180 270 1560 320"
            stroke="rgba(78, 227, 210, 0.09)"
            strokeWidth="1.5"
          />
          <path
            d="M -40 180 C 300 140 500 230 820 170 S 1240 110 1500 150"
            stroke="rgba(78, 227, 210, 0.08)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />

          {/* Cụm ma trận chấm bi (Dot Matrix Grid) lấy cảm hứng từ Travel The World */}
          <g transform="translate(430, 85)" fill="rgba(78, 227, 210, 0.28)">
            <circle cx="0" cy="0" r="2" />
            <circle cx="16" cy="0" r="2" />
            <circle cx="32" cy="0" r="2" />
            <circle cx="48" cy="0" r="2" />
            <circle cx="0" cy="16" r="2" />
            <circle cx="16" cy="16" r="2" />
            <circle cx="32" cy="16" r="2" />
            <circle cx="48" cy="16" r="2" />
            <circle cx="0" cy="32" r="2" />
            <circle cx="16" cy="32" r="2" />
            <circle cx="32" cy="32" r="2" />
            <circle cx="48" cy="32" r="2" />
          </g>

          {/* Cụm mũi tên tam giác du lịch ▶ ▶ ▶ */}
          <g transform="translate(370, 91)" fill="rgba(78, 227, 210, 0.35)">
            <polygon points="0,0 8,5 0,10" />
            <polygon points="12,0 20,5 12,10" />
            <polygon points="24,0 32,5 24,10" />
          </g>

          {/* Vòng la bàn hàng hải nghệ thuật ở khoảng trống giữa trang */}
          <g transform="translate(590, 200)" stroke="rgba(78, 227, 210, 0.2)" fill="none">
            <circle cx="0" cy="0" r="52" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="0" cy="0" r="42" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="4" fill="rgba(78, 227, 210, 0.35)" />
            <line x1="0" y1="-60" x2="0" y2="60" strokeWidth="1" />
            <line x1="-60" y1="0" x2="60" y2="0" strokeWidth="1" />
            <polygon points="0,-52 -5,-42 0,-45 5,-42" fill="rgba(78, 227, 210, 0.45)" />
            <polygon points="52,0 42,-5 45,0 42,5" fill="rgba(78, 227, 210, 0.28)" />
            <polygon points="0,52 -5,42 0,45 5,42" fill="rgba(78, 227, 210, 0.28)" />
            <polygon points="-52,0 -42,-5 -45,0 -42,5" fill="rgba(78, 227, 210, 0.28)" />
            <text x="0" y="-66" fill="rgba(78, 227, 210, 0.55)" fontSize="9" fontWeight="bold" textAnchor="middle" stroke="none">N</text>
            <text x="70" y="3" fill="rgba(78, 227, 210, 0.35)" fontSize="8" textAnchor="middle" stroke="none">E</text>
          </g>

          {/* Tọa độ hàng hải tinh tế lấp đầy khoảng giữa */}
          <text x="510" y="285" fill="rgba(78, 227, 210, 0.4)" fontSize="10.5" letterSpacing="0.2em" fontFamily="monospace">
            20°54′N 107°04′E · VIETNAM EXPEDITION
          </text>

          {/* Cụm ma trận chấm bi góc dưới */}
          <g transform="translate(100, 480)" fill="rgba(78, 227, 210, 0.2)">
            <circle cx="0" cy="0" r="1.8" />
            <circle cx="14" cy="0" r="1.8" />
            <circle cx="28" cy="0" r="1.8" />
            <circle cx="0" cy="14" r="1.8" />
            <circle cx="14" cy="14" r="1.8" />
            <circle cx="28" cy="14" r="1.8" />
          </g>
        </svg>
      </div>

      <div className={`ota-container ${styles.inner}`}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowText}>{vi.ota.heroEyebrow}</span>
            <span className={styles.eyebrowPlane} aria-hidden="true">✈</span>
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

        <figure
          className={styles.art}
          data-home-banner
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
        >
          <div className={styles.slitsCanvas}>
            <svg
              viewBox="0 0 1000 620"
              className={styles.slitsSvg}
              preserveAspectRatio="xMidYMid slice"
              aria-label={current.title}
            >
              <defs>
                {/* 3 Dải viên nang nghiêng nghệ thuật (Diagonal Pill Slits) theo phong cách Travel The World */}
                <clipPath id="diagonal-pill-slits" clipPathUnits="userSpaceOnUse">
                  {/* Dải 1: Vươn dài từ gần giữa màn hình, tạo điểm tựa thị giác */}
                  <rect x="0" y="0" width="920" height="135" rx="67.5" transform="translate(320, 270) rotate(-40)" />
                  {/* Dải 2: Ở giữa, vươn dài nhất */}
                  <rect x="0" y="0" width="980" height="150" rx="75" transform="translate(480, 400) rotate(-40)" />
                  {/* Dải 3: Ở phía dưới góc phải */}
                  <rect x="0" y="0" width="950" height="150" rx="75" transform="translate(640, 520) rotate(-40)" />
                  {/* Dải 4: Vệt sáng phụ thanh mảnh tạo nhịp điệu ánh sáng ở góc trên */}
                  <rect x="0" y="0" width="700" height="34" rx="17" transform="translate(580, 130) rotate(-40)" />
                </clipPath>
              </defs>

              {/* Lớp nền phát sáng đa tầng phía sau dải viên nang (Depth Glow) */}
              <g className={styles.slitGlowGroup} aria-hidden="true">
                <rect x="0" y="0" width="920" height="135" rx="67.5" transform="translate(320, 270) rotate(-40)" className={styles.slitGlowBorder} />
                <rect x="0" y="0" width="980" height="150" rx="75" transform="translate(480, 400) rotate(-40)" className={styles.slitGlowBorder} />
                <rect x="0" y="0" width="950" height="150" rx="75" transform="translate(640, 520) rotate(-40)" className={styles.slitGlowBorder} />
              </g>

              {/* Bức ảnh danh thắng trải dài LIÊN TỤC và LIỀN MẠCH qua cả 3 dải viên nang */}
              <g clipPath="url(#diagonal-pill-slits)">
                {HERO_SCENES.map((scene, idx) => {
                  const isActive = idx === activeScene;
                  return (
                    <image
                      key={scene.id}
                      href={scene.image}
                      width="1000"
                      height="620"
                      preserveAspectRatio="xMidYMid slice"
                      className={styles.svgSceneImage}
                      data-active={isActive || undefined}
                      aria-hidden={!isActive}
                    />
                  );
                })}
              </g>

              {/* Viền kính sang trọng phía trên dải viên nang (Glass Borders) */}
              <g className={styles.slitBorderGroup} aria-hidden="true">
                <rect x="0" y="0" width="920" height="135" rx="67.5" transform="translate(320, 270) rotate(-40)" className={styles.slitBorder} />
                <rect x="0" y="0" width="980" height="150" rx="75" transform="translate(480, 400) rotate(-40)" className={styles.slitBorder} />
                <rect x="0" y="0" width="950" height="150" rx="75" transform="translate(640, 520) rotate(-40)" className={styles.slitBorder} />
                <rect x="0" y="0" width="700" height="34" rx="17" transform="translate(580, 130) rotate(-40)" className={styles.slitAccentBorder} />
                {/* Dải phụ bóng ma nối nhịp sang phía trái */}
                <rect x="0" y="0" width="600" height="42" rx="21" transform="translate(180, 210) rotate(-40)" className={styles.slitGhostBorder} />
              </g>
            </svg>

            {/* Thẻ nổi Tripi Mascot Đồng Hành (3D Avatar) */}
            <aside className={styles.floatingMascotCard} aria-label={vi.ota.heroMascotCardTitle}>
              <div className={styles.mascotCardAvatar}>
                <TripiLive className={styles.mascotLive} />
              </div>
              <div className={styles.mascotCardContent}>
                <div className={styles.mascotCardHeader}>
                  <strong className={styles.mascotCardTitle}>{vi.ota.heroMascotCardTitle}</strong>
                  <span className={styles.mascotCardBadge}>✓</span>
                </div>
                <p className={styles.mascotCardSubtitle}>{vi.ota.heroMascotCardSubtitle}</p>
              </div>
            </aside>

            {/* Huy hiệu xu hướng nổi */}
            <div className={styles.floatingTrendingBadge}>
              <span className={styles.livePulseDot} aria-hidden="true" />
              <span>{vi.ota.heroTrendingBadge}</span>
            </div>

            {/* Thẻ nổi kính mờ chi tiết danh thắng ở góc dưới */}
            <Link
              prefetch={false}
              href={current.href}
              className={styles.floatingDestinationCard}
              key={current.id}
            >
              <div className={styles.floatingCardHead}>
                <span className={styles.floatingCardBadge}>{current.badge}</span>
                <span className={styles.floatingCardRating}>{current.rating}</span>
              </div>
              <strong className={styles.floatingCardTitle}>{current.title}</strong>
              <p className={styles.floatingCardSubtitle}>{current.subtitle}</p>
              <span className={styles.floatingCardAction}>
                {vi.ota.heroExploreNow} <span className={styles.cardActionArrow}>→</span>
              </span>
            </Link>

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
          </div>
        </figure>
      </div>
    </header>
  );
}
