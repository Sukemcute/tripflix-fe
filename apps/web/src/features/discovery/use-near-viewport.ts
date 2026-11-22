'use client';

import { useEffect, useRef, useState } from 'react';

/** Start below-the-fold queries shortly before their section becomes visible. */
export function useNearViewport() {
  const ref = useRef<HTMLElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setIsNear(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin: '200px 0px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isNear };
}
