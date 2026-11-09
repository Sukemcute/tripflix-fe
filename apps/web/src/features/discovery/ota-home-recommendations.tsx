'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHomeRecommendations } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import {
  DEFAULT_DESTINATION_IMAGE,
  DEFAULT_EXPERIENCE_IMAGE,
  DEFAULT_STAY_IMAGE,
  RECOMMENDATION_COMBOS,
  buildCombosFromApi,
} from './ota-recommendation-combos';
import { formatPrice } from './trip-card';
import { SoftStarIcon } from './soft-star-icon';
import styles from './ota-home.module.css';

const ROTATE_INTERVAL_MS = 5000;

function SafeComboImage({
  src,
  fallback,
  alt,
}: {
  src?: string;
  fallback: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const targetSrc = failed || !src ? fallback : src;

  return (
    <Image
      key={src}
      src={targetSrc}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, 48vw"
      // Ảnh khách sạn nằm trên CDN media, không qua bộ tối ưu ảnh của Next
      // (giống stay-thumbnail, hotel-gallery).
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

export function OtaHomeRecommendations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const { data: apiPicks } = useHomeRecommendations({ limit: 6 });
  const combos = useMemo(() => {
    return buildCombosFromApi(apiPicks ?? [], RECOMMENDATION_COMBOS);
  }, [apiPicks]);

  const activeCombo = (combos[activeIndex] ?? combos[0])!;

  const nextCombo = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % combos.length);
    startTimeRef.current = null;
    setProgress(0);
  }, [combos.length]);

  const prevCombo = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + combos.length) % combos.length);
    startTimeRef.current = null;
    setProgress(0);
  }, [combos.length]);

  const selectCombo = useCallback((index: number) => {
    setActiveIndex(index);
    startTimeRef.current = null;
    setProgress(0);
  }, []);

  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    const interval = setInterval(() => {
      if (isPaused) {
        if (startTimeRef.current !== null) {
          startTimeRef.current = Date.now() - (progress / 100) * ROTATE_INTERVAL_MS;
        }
        return;
      }

      const now = Date.now();
      const start = startTimeRef.current ?? now;
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / ROTATE_INTERVAL_MS) * 100);
      setProgress(pct);

      if (elapsed >= ROTATE_INTERVAL_MS) {
        nextCombo();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, progress, nextCombo]);

  return (
    <section
      id="home-recommendations"
      className={`ota-container ${styles.section}`}
      aria-labelledby="recommendations-title"
      data-home-reveal
    >
      <div
        onPointerEnter={() => setIsPaused(true)}
        onPointerLeave={() => setIsPaused(false)}
      >
        <div className={styles.sectionHead}>
        <div>
          <h2 id="recommendations-title">{vi.ota.recommendationTitle}</h2>
          <p>{vi.ota.recommendationIntro}</p>
        </div>
        <div className={styles.headActions}>
          <div className={styles.navArrows} aria-label="Điều hướng gợi ý">
            <button
              type="button"
              className={styles.arrowBtn}
              onClick={prevCombo}
              aria-label="Gợi ý trước"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.arrowBtn}
              onClick={nextCombo}
              aria-label="Gợi ý tiếp theo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <Link className={styles.textLink} href="/search">
            {vi.ota.browseHotels}
          </Link>
        </div>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.destinations}>
        {/* Ô 1: Điểm đến tâm điểm & Lý do nên đi (Lớn bên trái) */}
        <Link
          key={`dest-${activeCombo.id}`}
          href={activeCombo.destination.href}
          className={styles.destination}
          aria-label={`Khám phá điểm đến ${activeCombo.destination.name}`}
          data-home-banner
        >
          <SafeComboImage
            src={activeCombo.destination.image}
            fallback={DEFAULT_DESTINATION_IMAGE}
            alt={activeCombo.destination.name}
          />
          <div className={styles.cardContent}>
            <span className={`${styles.comboBadge} ${styles.badgeTrending}`}>
              {activeCombo.destination.badge}
            </span>
            <div>
              <span>{activeCombo.destination.region}</span>
              <h3>{activeCombo.destination.name}</h3>
              <p className={styles.destinationReason}>{activeCombo.destination.description}</p>
            </div>
            <div className={styles.comboMeta}>
              <strong>{activeCombo.destination.meta}</strong>
              <span aria-hidden="true">Khám phá điểm đến →</span>
            </div>
          </div>
        </Link>

        {/* Ô 2: Nơi lưu trú & Deal hời (Nhỏ phía trên bên phải) */}
        <Link
          key={`stay-${activeCombo.id}`}
          href={activeCombo.stay.href}
          className={styles.destination}
          aria-label={`Đặt phòng tại ${activeCombo.stay.name}`}
          data-home-banner
        >
          <SafeComboImage
            src={activeCombo.stay.image}
            fallback={DEFAULT_STAY_IMAGE}
            alt={activeCombo.stay.name}
          />
          <div className={styles.cardContent}>
            <span className={`${styles.comboBadge} ${styles.badgeDeal}`}>
              {activeCombo.stay.badge}
            </span>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {activeCombo.stay.region}
                {activeCombo.stay.stars ? <SoftStarIcon /> : null}
              </span>
              <h3>{activeCombo.stay.name}</h3>
              <p>{activeCombo.stay.description}</p>
            </div>
            <div className={styles.comboMeta}>
              <strong>{formatPrice(activeCombo.stay.priceFrom)}</strong>
              <span aria-hidden="true">
                {typeof activeCombo.stay.otherDealsCount === 'number' && activeCombo.stay.otherDealsCount > 0
                  ? `Khám phá thêm ${activeCombo.stay.otherDealsCount} deal hời →`
                  : 'Xem phòng →'}
              </span>
            </div>
          </div>
        </Link>

        {/* Ô 3: Cà phê & Ẩm thực (Nhỏ phía dưới bên phải) */}
        <Link
          key={`exp-${activeCombo.id}`}
          href={activeCombo.experience.href}
          className={styles.destination}
          aria-label={`Khám phá ${activeCombo.experience.name}`}
          data-home-banner
        >
          <SafeComboImage
            src={activeCombo.experience.image}
            fallback={DEFAULT_EXPERIENCE_IMAGE}
            alt={activeCombo.experience.name}
          />
          <div className={styles.cardContent}>
            <span className={styles.comboBadge}>
              {activeCombo.experience.badge}
            </span>
            <div>
              <span>{activeCombo.experience.location}</span>
              <h3>{activeCombo.experience.name}</h3>
              <p>{activeCombo.experience.description}</p>
            </div>
            <div className={styles.comboMeta}>
              <strong>{activeCombo.experience.ratingText}</strong>
              <span aria-hidden="true">Xem chi tiết →</span>
            </div>
          </div>
        </Link>
      </div>

      <nav className={styles.topicPills} aria-label="Danh sách điểm đến đề xuất">
        {combos.map((combo, index) => (
          <button
            type="button"
            key={combo.id}
            className={styles.topicPill}
            aria-pressed={index === activeIndex}
            onClick={() => selectCombo(index)}
          >
            {combo.topicLabel}
          </button>
        ))}
      </nav>
      </div>
    </section>
  );
}
