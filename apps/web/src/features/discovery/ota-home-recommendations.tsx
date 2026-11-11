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
  type RecommendationCombo,
  buildCombosFromApi,
} from './ota-recommendation-combos';
import { formatPrice } from './trip-card';
import { SoftStarIcon } from './soft-star-icon';
import styles from './ota-home.module.css';

const CROSSFADE_MS = 1200;
const ROTATE_INTERVAL_MS = 7000;

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
      src={targetSrc}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, 48vw"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function DestinationBody({
  combo,
  isOutgoing,
}: {
  combo: RecommendationCombo;
  isOutgoing?: boolean;
}) {
  return (
    <>
      <SafeComboImage
        src={combo.destination.image}
        fallback={DEFAULT_DESTINATION_IMAGE}
        alt={isOutgoing ? '' : combo.destination.name}
      />
      <div className={isOutgoing ? styles.cardContentOut : styles.cardContent}>
        <span className={`${styles.comboBadge} ${styles.badgeTrending}`}>
          {combo.destination.badge}
        </span>
        <div>
          <span>{combo.destination.region}</span>
          <h3>{combo.destination.name}</h3>
          <p className={styles.destinationReason}>{combo.destination.description}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>{combo.destination.meta}</strong>
          <span aria-hidden="true">Khám phá điểm đến →</span>
        </div>
      </div>
    </>
  );
}

function StayBody({
  combo,
  isOutgoing,
}: {
  combo: RecommendationCombo;
  isOutgoing?: boolean;
}) {
  return (
    <>
      <SafeComboImage
        src={combo.stay.image}
        fallback={DEFAULT_STAY_IMAGE}
        alt={isOutgoing ? '' : combo.stay.name}
      />
      <div className={isOutgoing ? styles.cardContentOut : styles.cardContent}>
        <span className={`${styles.comboBadge} ${styles.badgeDeal}`}>
          {combo.stay.badge}
        </span>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {combo.stay.region}
            {combo.stay.stars ? <SoftStarIcon /> : null}
          </span>
          <h3>{combo.stay.name}</h3>
          <p>{combo.stay.description}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>{formatPrice(combo.stay.priceFrom)}</strong>
          <span aria-hidden="true">
            {typeof combo.stay.otherDealsCount === 'number' && combo.stay.otherDealsCount > 0
              ? `Khám phá thêm ${combo.stay.otherDealsCount} deal hời →`
              : 'Xem phòng →'}
          </span>
        </div>
      </div>
    </>
  );
}

function ExperienceBody({
  combo,
  isOutgoing,
}: {
  combo: RecommendationCombo;
  isOutgoing?: boolean;
}) {
  return (
    <>
      <SafeComboImage
        src={combo.experience.image}
        fallback={DEFAULT_EXPERIENCE_IMAGE}
        alt={isOutgoing ? '' : combo.experience.name}
      />
      <div className={isOutgoing ? styles.cardContentOut : styles.cardContent}>
        <span className={styles.comboBadge}>
          {combo.experience.badge}
        </span>
        <div>
          <span>{combo.experience.location}</span>
          <h3>{combo.experience.name}</h3>
          <p>{combo.experience.description}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>{combo.experience.ratingText}</strong>
          <span aria-hidden="true">Xem chi tiết →</span>
        </div>
      </div>
    </>
  );
}

export function OtaHomeRecommendations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pauseReasonsRef = useRef({ hidden: false, offscreen: false, hover: false, focus: false });
  const [isPaused, setIsPaused] = useState(false);

  const { data: apiPicks } = useHomeRecommendations({ limit: 6 });
  const combos = useMemo(() => {
    return buildCombosFromApi(apiPicks ?? [], RECOMMENDATION_COMBOS);
  }, [apiPicks]);

  const activeCombo = (combos[activeIndex] ?? combos[0])!;
  const prevCombo = prevIndex !== null ? combos[prevIndex] ?? null : null;

  const changeCombo = useCallback(
    (getNextIndex: (prev: number) => number) => {
      if (isTransitioning) return;
      const nextIdx = getNextIndex(activeIndex);
      if (nextIdx === activeIndex) return;

      setPrevIndex(activeIndex);
      setActiveIndex(nextIdx);
      setIsTransitioning(true);

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setPrevIndex(null);
      }, CROSSFADE_MS);
    },
    [activeIndex, isTransitioning],
  );

  const handleNextCombo = useCallback(() => {
    changeCombo((prev) => (prev + 1) % combos.length);
  }, [changeCombo, combos.length]);

  const handlePrevCombo = useCallback(() => {
    changeCombo((prev) => (prev - 1 + combos.length) % combos.length);
  }, [changeCombo, combos.length]);

  // Dừng xoay khi tab ẩn, box ngoài viewport, chuột đang trỏ vào hoặc đang focus bàn phím.
  const setPauseReason = useCallback((reason: keyof typeof pauseReasonsRef.current, value: boolean) => {
    pauseReasonsRef.current[reason] = value;
    setIsPaused(Object.values(pauseReasonsRef.current).some(Boolean));
  }, []);

  useEffect(() => {
    const onVisibility = () => setPauseReason('hidden', document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(([entry]) =>
      setPauseReason('offscreen', !entry?.isIntersecting),
    );
    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, [setPauseReason]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      handleNextCombo();
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [handleNextCombo, isPaused]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      // Chỉ chuột thật mới dừng xoay; chạm trên cảm ứng không có pointerleave nên sẽ kẹt.
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPauseReason('hover', true)}
      onPointerLeave={() => setPauseReason('hover', false)}
      // Chỉ focus bằng bàn phím; bấm chuột vào nút mũi tên không làm dừng mãi.
      onFocus={(e) => e.target.matches(':focus-visible') && setPauseReason('focus', true)}
      onBlur={() => setPauseReason('focus', false)}
      id="home-recommendations"
      className={`ota-container ${styles.section}`}
      aria-labelledby="recommendations-title"
      data-home-reveal
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
              onClick={handlePrevCombo}
              aria-label="Gợi ý trước"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.arrowBtn}
              onClick={handleNextCombo}
              aria-label="Gợi ý tiếp theo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <Link prefetch={false} className={styles.textLink} href="/search">
            {vi.ota.browseHotels}
          </Link>
        </div>
      </div>

      <div className={styles.destinations}>
        {/* Ô 1: Điểm đến tâm điểm & Lý do nên đi (Lớn bên trái) */}
        <Link
          prefetch={false}
          key="slot-destination"
          href={activeCombo.destination.href}
          className={styles.destination}
          aria-label={`Khám phá điểm đến ${activeCombo.destination.name}`}
          data-home-banner
        >
          {prevCombo ? (
            <div className={styles.cardLayerOutgoing} aria-hidden="true">
              <DestinationBody combo={prevCombo} isOutgoing />
            </div>
          ) : null}
          <div className={isTransitioning ? styles.cardLayerIncoming : styles.cardLayerActive}>
            <DestinationBody combo={activeCombo} />
          </div>
        </Link>

        {/* Ô 2: Nơi lưu trú & Deal hời (Nhỏ phía trên bên phải) */}
        <Link
          prefetch={false}
          key="slot-stay"
          href={activeCombo.stay.href}
          className={styles.destination}
          aria-label={`Đặt phòng tại ${activeCombo.stay.name}`}
          data-home-banner
        >
          {prevCombo ? (
            <div className={styles.cardLayerOutgoing} aria-hidden="true">
              <StayBody combo={prevCombo} isOutgoing />
            </div>
          ) : null}
          <div className={isTransitioning ? styles.cardLayerIncoming : styles.cardLayerActive}>
            <StayBody combo={activeCombo} />
          </div>
        </Link>

        {/* Ô 3: Cà phê & Ẩm thực (Nhỏ phía dưới bên phải) */}
        <Link
          prefetch={false}
          key="slot-experience"
          href={activeCombo.experience.href}
          className={styles.destination}
          aria-label={`Khám phá ${activeCombo.experience.name}`}
          data-home-banner
        >
          {prevCombo ? (
            <div className={styles.cardLayerOutgoing} aria-hidden="true">
              <ExperienceBody combo={prevCombo} isOutgoing />
            </div>
          ) : null}
          <div className={isTransitioning ? styles.cardLayerIncoming : styles.cardLayerActive}>
            <ExperienceBody combo={activeCombo} />
          </div>
        </Link>
      </div>
    </section>
  );
}
