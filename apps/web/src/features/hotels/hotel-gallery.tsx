'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '@tripflix/i18n';
import { isOptimizedImageUrl } from '../../lib/remote-images';
import styles from './hotel.module.css';

const galleryIconPaths = {
  close: 'M6 6l12 12M18 6L6 18',
  previous: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
};

const galleryLayouts = {
  grid: styles.gallery,
  compact: styles.compactGallery,
  carousel: styles.roomCarousel,
};

function GalleryIcon({ name }: { name: keyof typeof galleryIconPaths }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d={galleryIconPaths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HotelPhoto({ url, alt }: { url: string; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (failedUrl === url) {
    return alt ? <span className={styles.missingPhoto}>{vi.hotel.imageUnavailable}</span> : null;
  }
  return (
    <Image
      src={url}
      alt={alt}
      width={1000}
      height={700}
      sizes="(max-width: 768px) 100vw, 60vw"
      unoptimized={!isOptimizedImageUrl(url)}
      onError={() => setFailedUrl(url)}
    />
  );
}

export function HotelGallery({
  images,
  name,
  layout = 'grid',
}: {
  images: string[];
  name: string;
  layout?: keyof typeof galleryLayouts;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const activeThumbnail = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const urls = [...new Set(images)].filter((url) => /^https?:\/\//i.test(url));
  const count = urls.length;
  const activeIndex = Math.min(index, count - 1);
  const move = useCallback((offset: number) => {
    setIndex((previous) => (Math.min(previous, count - 1) + offset + count) % count);
  }, [count]);

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const closeFromBackdrop = (event: MouseEvent) => {
      if (event.target === modal) modal.close();
    };
    const navigateByKey = (event: KeyboardEvent) => {
      if (count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    };
    modal.addEventListener('click', closeFromBackdrop);
    modal.addEventListener('keydown', navigateByKey);
    return () => {
      modal.removeEventListener('click', closeFromBackdrop);
      modal.removeEventListener('keydown', navigateByKey);
    };
  }, [count, move]);
  useEffect(() => {
    if (dialog.current?.open) {
      activeThumbnail.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeIndex]);
  if (!count) return null;
  const isCarousel = layout === 'carousel';
  const previews = isCarousel
    ? [{ url: urls[activeIndex]!, position: activeIndex }]
    : urls.slice(0, layout === 'compact' ? 3 : 5).map((url, position) => ({ url, position }));
  return (
    <>
      <div
        className={galleryLayouts[layout]}
        role={isCarousel ? 'group' : undefined}
        aria-label={isCarousel ? `${vi.hotel.gallery}: ${name}` : undefined}
      >
        {previews.map(({ url, position }) => (
          <button
            type="button"
            key={isCarousel ? 'active-photo' : url}
            className={isCarousel ? styles.carouselPhoto : undefined}
            aria-haspopup="dialog"
            onClick={() => {
              setIndex(position);
              dialog.current?.showModal();
            }}
            aria-label={`${vi.hotel.photo} ${position + 1}: ${name}`}
          >
            <HotelPhoto key={url} url={url} alt={`${name} · ${vi.hotel.photo} ${position + 1}`} />
            {layout === 'grid' && position === Math.min(4, count - 1) && (
              <span className={styles.galleryCount}>
                {vi.hotel.gallery} ({count})
              </span>
            )}
          </button>
        ))}
        {isCarousel && count > 1 && (
          <>
            <button className={styles.carouselArrow} type="button" aria-label={vi.hotel.previous} onClick={() => move(-1)}>
              <GalleryIcon name="previous" />
            </button>
            <button className={styles.carouselArrow} type="button" aria-label={vi.hotel.next} onClick={() => move(1)}>
              <GalleryIcon name="next" />
            </button>
            <output className={styles.carouselCount}>{activeIndex + 1} / {count}</output>
          </>
        )}
      </div>
      <dialog
        ref={dialog}
        className={styles.photoDialog}
        aria-label={`${vi.hotel.gallery}: ${name}`}
      >
        <div className={styles.photoViewer}>
          <header className={styles.photoHeader}>
            <div>
              <strong>{name}</strong>
              <output>{vi.hotel.photo} {activeIndex + 1} / {count}</output>
            </div>
            <button
              className={styles.photoControl}
              type="button"
              aria-label={vi.hotel.close}
              onClick={() => dialog.current?.close()}
            >
              <GalleryIcon name="close" />
            </button>
          </header>
          <div className={styles.photoStage}>
            <HotelPhoto
              key={urls[activeIndex]}
              url={urls[activeIndex]!}
              alt={`${name} · ${vi.hotel.photo} ${activeIndex + 1}`}
            />
          </div>
          {count > 1 && (
            <div className={styles.photoNavigation}>
              <button className={styles.photoControl} type="button" aria-label={vi.hotel.previous} onClick={() => move(-1)}>
                <GalleryIcon name="previous" />
              </button>
              <div className={styles.photoThumbnails}>
                {urls.map((url, position) => (
                  <button
                    type="button"
                    key={url}
                    ref={position === activeIndex ? activeThumbnail : undefined}
                    aria-label={`${vi.hotel.photo} ${position + 1}`}
                    aria-current={position === activeIndex ? 'true' : undefined}
                    onClick={() => setIndex(position)}
                  >
                    <span aria-hidden="true">{position + 1}</span>
                    <HotelPhoto url={url} alt="" />
                  </button>
                ))}
              </div>
              <button className={styles.photoControl} type="button" aria-label={vi.hotel.next} onClick={() => move(1)}>
                <GalleryIcon name="next" />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
