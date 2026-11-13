'use client';

import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { Pacifico } from 'next/font/google';
import { LivingBackground } from './LivingBackground';
import styles from './ota-home-motion.module.css';

const handwritingFont = Pacifico({
  subsets: ['vietnamese', 'latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-home-handwriting',
});

export function OtaHomeMotion({ children }: { children: ReactNode }) {
  const homeRef = useRef<HTMLElement>(null);
  const pointerFrameRef = useRef(0);
  const pointerUpdateRef = useRef<{ banner: HTMLElement; x: number; y: number } | undefined>(undefined);

  const trackBannerPointer = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
    const banner = event.target.closest<HTMLElement>('[data-home-banner]');
    if (!banner) return;
    pointerUpdateRef.current = { banner, x: event.clientX, y: event.clientY };
    if (pointerFrameRef.current) return;
    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = 0;
      const update = pointerUpdateRef.current;
      if (!update) return;
      const bounds = update.banner.getBoundingClientRect();
      const x = (update.x - bounds.left) / bounds.width;
      const y = (update.y - bounds.top) / bounds.height;
      update.banner.style.setProperty('--pointer-x', String(x - 0.5));
      update.banner.style.setProperty('--pointer-y', String(y - 0.5));
      update.banner.style.setProperty('--card-tilt-x', String((x - 0.5) * 2));
      update.banner.style.setProperty('--card-tilt-y', String((y - 0.5) * 2));
      update.banner.style.setProperty('--mouse-x', `${x * 100}%`);
      update.banner.style.setProperty('--mouse-y', `${y * 100}%`);
    });
  }, []);

  const resetBannerPointer = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return;
    const banner = event.target.closest<HTMLElement>('[data-home-banner]');
    if (!banner || (event.relatedTarget instanceof Node && banner.contains(event.relatedTarget))) return;
    pointerUpdateRef.current = undefined;
    for (const property of ['--pointer-x', '--pointer-y', '--card-tilt-x', '--card-tilt-y', '--mouse-x', '--mouse-y']) {
      banner.style.removeProperty(property);
    }
  }, []);

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
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pointerFrameRef.current);
    };
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
