'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './tripi-live.module.css';

const TripiRive = dynamic(() => import('./tripi-rive').then((module) => module.TripiRive), {
  ssr: false,
});

export function TripiLive({
  className,
  interactive = true,
}: {
  className?: string;
  interactive?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [motion, setMotion] = useState(false);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      setMotion(!preference.matches);
      if (preference.matches) setReady(false);
    };
    updateMotion();
    preference.addEventListener('change', updateMotion);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setRequested(true);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', updateMotion);
    };
  }, []);

  return (
    <div ref={container} className={`${styles.root} ${ready ? styles.ready : ''} ${className ?? ''}`}>
      <Image
        src="/brand/tripi-rive/tripi-still.webp"
        width={256}
        height={256}
        alt=""
        className={styles.still}
        style={{ opacity: motion && ready ? 0 : 1 }}
      />
      {motion && requested && (
        <TripiRive active={visible} interactive={interactive} onReady={setReady} />
      )}
    </div>
  );
}
