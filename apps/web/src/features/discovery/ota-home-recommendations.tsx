'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
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
  const [failedSource, setFailedSource] = useState<string>();
  const targetSrc = failedSource === src || !src ? fallback : src;

  return (
    <Image
      src={targetSrc}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, 48vw"
      unoptimized
      style={{ objectPosition: src?.includes('da-lat') ? 'center 78%' : 'center' }}
      onError={() => setFailedSource(src)}
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
          <span className={styles.badgeShimmerGlow} aria-hidden="true" />
          {combo.destination.badge}
        </span>
        <div>
          <span>{combo.destination.region}</span>
          <h3>{combo.destination.name}</h3>
          <p className={styles.destinationReason}>{combo.destination.description}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>{combo.destination.meta}</strong>
          <span className={styles.actionPrompt} aria-hidden="true">
            Khám phá điểm đến <span className={styles.arrowBounce}>→</span>
          </span>
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
          <span className={styles.badgeShimmerGlow} aria-hidden="true" />
          {combo.stay.verifiedPrice ? combo.stay.badge : 'Gợi ý lưu trú'}
        </span>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {combo.stay.region}
            {combo.stay.verifiedPrice && combo.stay.stars ? <SoftStarIcon /> : null}
          </span>
          <h3>{combo.stay.verifiedPrice ? combo.stay.name : `Nơi ở tại ${combo.destination.name}`}</h3>
          <p>{combo.stay.verifiedPrice ? combo.stay.description : 'Khám phá khách sạn, chọn ngày và so sánh giá cho chuyến đi.'}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>{combo.stay.verifiedPrice ? formatPrice(combo.stay.priceFrom) : 'Xem giá theo ngày'}</strong>
          <span className={styles.actionPrompt} aria-hidden="true">
            {combo.stay.verifiedPrice && typeof combo.stay.otherDealsCount === 'number' && combo.stay.otherDealsCount > 0
              ? `Thêm ${combo.stay.otherDealsCount} deal hời`
              : 'Xem phòng'}{' '}
            <span className={styles.arrowBounce}>→</span>
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
          <span className={styles.badgeShimmerGlow} aria-hidden="true" />
          {combo.experience.badge}
        </span>
        <div>
          <span>{combo.experience.location}</span>
          <h3>{combo.experience.name}</h3>
          <p>{combo.experience.description}</p>
        </div>
        <div className={styles.comboMeta}>
          <strong>Trải nghiệm địa phương</strong>
          <span className={styles.actionPrompt} aria-hidden="true">
            Xem chi tiết <span className={styles.arrowBounce}>→</span>
          </span>
        </div>
      </div>
    </>
  );
}

function handleCardMouseMove(e: MouseEvent<HTMLAnchorElement>) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const xPercent = (x / rect.width) * 100;
  const yPercent = (y / rect.height) * 100;
  const tiltX = (x / rect.width - 0.5) * 2;
  const tiltY = (y / rect.height - 0.5) * 2;

  card.style.setProperty('--card-tilt-x', String(tiltX));
  card.style.setProperty('--card-tilt-y', String(tiltY));
  card.style.setProperty('--mouse-x', `${xPercent}%`);
  card.style.setProperty('--mouse-y', `${yPercent}%`);
}

function handleCardMouseLeave(e: MouseEvent<HTMLAnchorElement>) {
  const card = e.currentTarget;
  card.style.removeProperty('--card-tilt-x');
  card.style.removeProperty('--card-tilt-y');
  card.style.removeProperty('--mouse-x');
  card.style.removeProperty('--mouse-y');
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
      // Giữ nguyên gợi ý trong lúc người dùng điều hướng bằng bàn phím.
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
        <Link prefetch={false} className={styles.textLink} href="/search">
          {vi.ota.browseHotels}
        </Link>
      </div>

      <div className={styles.destinations}>
        {/* Ô 1: Điểm đến tâm điểm (Lớn bên trái) */}
        <Link
          prefetch={false}
          key="slot-destination"
          href={activeCombo.destination.href}
          className={styles.destination}
          aria-label={`Khám phá điểm đến ${activeCombo.destination.name}`}
          data-home-banner
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          <div className={styles.cardSpecularGlare} aria-hidden="true" />
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
          aria-label={`Tìm nơi ở tại ${activeCombo.destination.name}`}
          data-home-banner
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          <div className={styles.cardSpecularGlare} aria-hidden="true" />
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
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          <div className={styles.cardSpecularGlare} aria-hidden="true" />
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
      {activeCombo.experience.image?.endsWith('/da-lat-cafe.webp') && <p className={styles.photoCredit}>Ảnh quán: Fanpage Cheo Veooo, qua <a href="https://dalatdiary.com/en/image-credits/" target="_blank" rel="noreferrer">Dalat Diary</a>. Ảnh cảnh quan minh họa khu vực Đà Lạt.</p>}
    </section>
  );
}
