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
      className={styles.oceanCanvas}
      onPointerMove={trackBannerPointer}
      onPointerOut={resetBannerPointer}
    >
      {/* CÁC LAYER ĐỒ HỌA THẾ GIỚI ĐẠI DƯƠNG HẬU CẢNH (LARACON VIII SEAMLESS STYLE) */}
      <div className={styles.oceanBackdropLayer} aria-hidden="true">
        {/* 1. Tia nắng rọi xuyên qua làn nước biển sâu (Underwater Sunbeams) */}
        <div className={styles.sunbeams} />

        {/* 2. Chú cá voi khổng lồ lượn lờ trong làn nước sâu (Laracon VIII Whale) */}
        <div className={styles.whaleSilhouetteWrapper}>
          <svg className={styles.whaleSvg} viewBox="0 0 520 220" fill="none">
            {/* Thân cá voi uốn lượn */}
            <path
              d="M 60 110 C 100 65, 200 45, 300 55 C 380 65, 430 90, 480 105 C 440 102, 395 112, 350 135 C 290 165, 210 172, 150 155 C 105 142, 80 128, 60 110 Z"
              fill="currentColor"
            />
            {/* Đuôi cá voi xoè rộng */}
            <path
              d="M 65 110 C 45 95, 20 70, 5 75 C 15 95, 30 110, 45 114 C 28 120, 10 138, 5 152 C 22 155, 48 130, 68 116 Z"
              fill="currentColor"
            />
            {/* Vây bơi bên hông */}
            <path
              d="M 280 145 C 295 170, 310 195, 325 210 C 322 195, 320 175, 312 155 Z"
              fill="currentColor"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Đàn cá nhỏ bơi theo cá voi */}
        <div className={styles.schoolOfFish}>
          <svg viewBox="0 0 160 70" fill="rgba(56, 189, 248, 0.5)">
            <ellipse cx="20" cy="20" rx="8" ry="3" />
            <polygon points="12,20 6,17 6,23" />
            <ellipse cx="45" cy="14" rx="7" ry="2.5" />
            <polygon points="38,14 33,11 33,17" />
            <ellipse cx="38" cy="32" rx="9" ry="3.5" />
            <polygon points="29,32 23,29 23,35" />
            <ellipse cx="70" cy="24" rx="8" ry="3" />
            <polygon points="62,24 56,21 56,27" />
            <ellipse cx="95" cy="18" rx="6" ry="2" />
            <polygon points="89,18 84,16 84,20" />
            <ellipse cx="85" cy="38" rx="7" ry="2.8" />
            <polygon points="78,38 73,35 73,41" />
            <ellipse cx="120" cy="28" rx="8" ry="3" />
            <polygon points="112,28 106,25 106,31" />
          </svg>
        </div>

        {/* 3. Bong bóng nước bập bềnh nổi lên */}
        <span className={`${styles.bubble} ${styles.b1}`} />
        <span className={`${styles.bubble} ${styles.b2}`} />
        <span className={`${styles.bubble} ${styles.b3}`} />
        <span className={`${styles.bubble} ${styles.b4}`} />
        <span className={`${styles.bubble} ${styles.b5}`} />

        {/* 4. Rạn san hô & Rong biển hai bên viền màn hình */}
        <svg className={styles.coralLeft} viewBox="0 0 140 380" preserveAspectRatio="none">
          <path d="M 0 380 L 0 120 Q 35 150, 45 200 T 70 280 T 95 380 Z" />
          <path d="M 0 380 L 0 200 Q 55 180, 65 240 T 115 320 T 130 380 Z" opacity="0.6" />
          <path d="M 0 380 L 0 60 Q 25 100, 30 180 T 50 300 T 65 380 Z" opacity="0.4" />
        </svg>

        <svg className={styles.coralRight} viewBox="0 0 160 420" preserveAspectRatio="none">
          <path d="M 160 420 L 160 100 Q 115 140, 110 210 T 80 310 T 55 420 Z" />
          <path d="M 160 420 L 160 180 Q 95 190, 85 260 T 40 350 T 20 420 Z" opacity="0.55" />
          <path d="M 160 420 L 160 40 Q 135 90, 130 180 T 100 290 T 80 420 Z" opacity="0.35" />
        </svg>
      </div>

      {children}
    </main>
  );
}
