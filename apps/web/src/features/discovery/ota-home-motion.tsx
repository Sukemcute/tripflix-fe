'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { TopographicContours } from './torn-paper';
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
      {/* LỚP HOA VĂN BẢN ĐỒ ĐỊA HÌNH & ÁNH SÁNG AMBIENT XUYÊN SUỐT TOÀN TRANG */}
      <div className={styles.landscapeBackdropLayer} aria-hidden="true">
        {/* 1. Hoa văn địa hình topo mờ ảo tạo chất phiêu lưu / National Geographic */}
        <TopographicContours />

        {/* 2. Quầng sáng nắng mai ấm áp phía trên (Morning Warm Glow) */}
        <div className={styles.morningAmbientGlow} />

            {/* 3. Quầng sáng ngọc bích phía dưới (Teal Sea Glow) */}
            <div className={styles.tealSeaGlow} />

        {/* 4. Cặp chim hải âu chao liệng nhẹ nhàng */}
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
