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

          <nav className={styles.activities} aria-label={vi.api.otaActivityLabel}>
            {ACTIVITIES.map(([image, name]) => (
              <Link
                prefetch={false}
                key={image}
                href={{ pathname: '/inspiration', query: { q: name } }}
                className={styles.activityPill}
              >
                <Image src={`/brand/${image}`} alt="" width={28} height={28} />
                <span>{name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <figure
          className={styles.art}
          data-home-banner
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
        >
          <div className={styles.frame}>
            {HERO_SCENES.map((scene, idx) => {
              const isActive = idx === activeScene;
              return (
                <div
                  key={scene.id}
                  className={styles.photoLayer}
                  data-active={isActive || undefined}
                  aria-hidden={!isActive}
                >
                  <Image
                    className={styles.photo}
                    src={scene.image}
                    alt={scene.title}
                    fill
                    sizes="(max-width: 760px) 95vw, 55vw"
                    priority={idx === 0}
                  />
                </div>
              );
            })}

            {/* Lớp phủ chuyển sắc để tăng tương phản chữ */}
            <div className={styles.sceneGradient} aria-hidden="true" />

            {/* Thẻ nổi Tripi Mascot Đồng Hành (Tương tự thẻ Travorra Happy Travelers) */}
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

            {/* Huy hiệu xu hướng nổi góc trên (Floating Glassmorphism) */}
            <div className={styles.floatingTrendingBadge}>
              <span className={styles.livePulseDot} aria-hidden="true" />
              <span>{vi.ota.heroTrendingBadge}</span>
            </div>

            {/* Lộ trình di chuyển nét đứt chuyển động mượt mà */}
            <svg className={styles.route} viewBox="0 0 150 210" fill="none" aria-hidden="true">
              <path
                className={styles.animatedRoutePath}
                d="M 20 190 C 106 168 17 121 81 101 S 155 35 117 19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
              <circle cx="20" cy="190" r="5" fill="currentColor" />
              <circle cx="20" cy="190" r="9" className={styles.radarPulse} fill="currentColor" opacity="0.35" />
              <circle cx="117" cy="19" r="5" fill="currentColor" />
              <circle cx="117" cy="19" r="9" className={styles.radarPulse} fill="currentColor" opacity="0.35" />
            </svg>

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
