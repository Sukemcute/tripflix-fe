'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { Pacifico } from 'next/font/google';
import { LivingBackground } from './LivingBackground';
import styles from './ota-home-motion.module.css';

const handwritingFont = Pacifico({
  subsets: ['vietnamese', 'latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-home-handwriting',
});

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
      data-living-home
      ref={homeRef}
      className={`${styles.layeredCanvas} ${handwritingFont.variable}`}
      onPointerMove={trackBannerPointer}
      onPointerOut={resetBannerPointer}
    >
      <div className={styles.waterContent}>{children}</div>
      <LivingBackground />
    </main>
  );
}
