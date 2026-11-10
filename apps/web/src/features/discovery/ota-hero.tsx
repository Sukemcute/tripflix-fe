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
          {/* Thẻ nổi kính mờ danh lam thắng cảnh lồng ảnh thực tế (như mẫu Phố cổ Hội An) */}
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
                sizes="(max-width: 640px) 120px, 190px"
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
    </header>
  );
}
