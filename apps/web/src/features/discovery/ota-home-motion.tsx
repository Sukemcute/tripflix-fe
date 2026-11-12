'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import styles from './ota-home-motion.module.css';

function trackBannerPointer(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
  const banner = event.target.closest<HTMLElement>('[data-home-banner]');
  if (!banner) return;

  const bounds = banner.getBoundingClientRect();
  banner.style.setProperty('--pointer-x', String((event.clientX - bounds.left) / bounds.width - 0.5));
  banner.style.setProperty('--pointer-y', String((event.clientY - bounds.top) / bounds.height - 0.5));
}

function resetBannerPointer(event: PointerEvent<HTMLElement>): void {
  if (!(event.target instanceof Element)) return;
  const banner = event.target.closest<HTMLElement>('[data-home-banner]');
  if (!banner || (event.relatedTarget instanceof Node && banner.contains(event.relatedTarget))) return;

  banner.style.removeProperty('--pointer-x');
  banner.style.removeProperty('--pointer-y');
}

export function OtaHomeMotion({ children }: { children: ReactNode }) {
  const homeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const home = homeRef.current;
    if (!home || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-home-entered', '');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );

    home.querySelectorAll('[data-home-reveal]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main
      id="content"
      ref={homeRef}
      className={styles.layeredCanvas}
      onPointerMove={trackBannerPointer}
      onPointerOut={resetBannerPointer}
    >
      {/* CÁC LAYER CẢNH QUAN 2D XẾP LỚP TƯƠI SÁNG (LAYERED 2D ENVIRONMENTAL JOURNEY) */}
      <div className={styles.landscapeBackdropLayer} aria-hidden="true">
        {/* 1. Vệt nắng mai vàng mật ong ấm áp xuyên mây (Morning Sunshine Glow) */}
        <div className={styles.morningSunbeams} />

        {/* 2. Dải sóng biển ngọc bích 2D chuyển tiếp sau Hero (Shoreline Teal Waves) */}
        <div className={styles.shoreWaveTransition}>
          <svg viewBox="0 0 1440 180" preserveAspectRatio="none" fill="none">
            <path
              d="M 0 60 C 320 20, 640 110, 960 50 C 1200 10, 1360 80, 1440 60 L 1440 180 L 0 180 Z"
              fill="rgba(0, 178, 163, 0.08)"
            />
            <path
              d="M 0 95 C 280 65, 560 140, 880 85 C 1140 45, 1320 115, 1440 90 L 1440 180 L 0 180 Z"
              fill="rgba(217, 244, 241, 0.45)"
            />
          </svg>
        </div>

        {/* 3. Dãy đồi núi xanh 2D xếp tầng (Layered Highland Hills & Forest) - Lấy cảm hứng từ tranh dã ngoại */}
        <div className={styles.highlandHillsWrapper}>
          <svg className={styles.highlandHillsSvg} viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="hillFarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#86efac" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="hillMidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00b2a3" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="hillNearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#FFF7F2" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Đồi xa mờ sương */}
            <path
              d="M 0 140 Q 220 80, 480 125 T 980 90 T 1440 130 L 1440 320 L 0 320 Z"
              fill="url(#hillFarGrad)"
            />

            {/* Đồi trung ngọc bích với rặng thông 2D mini */}
            <path
              d="M 0 190 Q 340 130, 680 185 T 1200 150 T 1440 180 L 1440 320 L 0 320 Z"
              fill="url(#hillMidGrad)"
            />

            {/* Đồi cận uốn lượn chuyển tiếp êm dịu sang Warm Mist */}
            <path
              d="M 0 240 Q 260 190, 560 235 T 1060 210 T 1440 245 L 1440 320 L 0 320 Z"
              fill="url(#hillNearGrad)"
            />

            {/* Rặng thông 2D cách điệu phong cách Bắc Âu / Đà Lạt */}
            <g fill="rgba(0, 178, 163, 0.28)">
              <polygon points="120,175 127,192 113,192" />
              <polygon points="120,182 129,198 111,198" />
              <polygon points="135,178 141,192 129,192" />
              <polygon points="135,185 143,198 127,198" />
              <polygon points="860,140 867,156 853,156" />
              <polygon points="860,148 869,164 851,164" />
              <polygon points="878,144 884,158 872,158" />
              <polygon points="878,151 886,165 870,165" />
            </g>
          </svg>
        </div>

        {/* 4. Dải sóng cát bờ biển vàng ấm (Sunset Shoreline & Sand Dunes) */}
        <div className={styles.sandDunesWrapper}>
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none" fill="none">
            <path
              d="M 0 100 C 380 40, 780 140, 1120 70 C 1280 40, 1380 90, 1440 80 L 1440 220 L 0 220 Z"
              fill="rgba(254, 243, 199, 0.45)"
            />
            <path
              d="M 0 140 C 320 90, 680 170, 1020 120 C 1220 90, 1350 150, 1440 130 L 1440 220 L 0 220 Z"
              fill="rgba(255, 247, 242, 0.75)"
            />
          </svg>
        </div>

        {/* 5. Cánh chim hải âu chao lượn trên cao nguyên và mây trôi */}
        <svg className={`${styles.highlandBird} ${styles.hb1}`} viewBox="0 0 24 12">
          <path d="M0,8 C6,2 10,2 12,6 C14,2 18,2 24,8 C18,6 14,8 12,12 C10,8 6,6 0,8 Z" />
        </svg>
        <svg className={`${styles.highlandBird} ${styles.hb2}`} viewBox="0 0 24 12">
          <path d="M0,8 C6,2 10,2 12,6 C14,2 18,2 24,8 C18,6 14,8 12,12 C10,8 6,6 0,8 Z" />
        </svg>
      </div>

      {children}
    </main>
  );
}
