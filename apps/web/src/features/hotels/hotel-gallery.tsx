'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { vi } from '@tripflix/i18n';
import styles from './hotel.module.css';

export function HotelPhoto({ url, alt }: { url: string; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (failedUrl === url) return <span className={styles.missingPhoto}>{vi.hotel.imageUnavailable}</span>;
  return (
    <Image src={url} alt={alt} width={1000} height={700} unoptimized onError={() => setFailedUrl(url)} />
  );
}

export function HotelGallery({
  images,
  name,
  compact = false,
}: {
  images: string[];
  name: string;
  compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const urls = [...new Set(images)].filter((url) => /^https?:\/\//i.test(url));
  if (!urls.length) return null;
  const move = (offset: number) => setIndex((previous) => (previous + offset + urls.length) % urls.length);
  return (
    <>
      <div className={compact ? styles.compactGallery : styles.gallery}>
        {urls.slice(0, compact ? 3 : 5).map((url, position) => (
          <button
            type="button"
            key={url}
            onClick={() => {
              setIndex(position);
              dialog.current?.showModal();
            }}
            aria-label={`${vi.hotel.photo} ${position + 1}: ${name}`}
          >
            <HotelPhoto url={url} alt={`${name} · ${vi.hotel.photo} ${position + 1}`} />
            {!compact && position === Math.min(4, urls.length - 1) && (
              <span className={styles.galleryCount}>
                {vi.hotel.gallery} ({urls.length})
              </span>
            )}
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className={styles.photoDialog}
        aria-label={`${vi.hotel.gallery}: ${name}`}
      >
        <div className={styles.dialogToolbar}>
          <span>
            {index + 1} / {urls.length}
          </span>
          <button className="secondary-button" type="button" onClick={() => dialog.current?.close()}>
            {vi.hotel.close}
          </button>
        </div>
        <HotelPhoto url={urls[index]!} alt={`${name} · ${vi.hotel.photo} ${index + 1}`} />
        {urls.length > 1 && (
          <div className={styles.dialogToolbar}>
            <button className="secondary-button" type="button" onClick={() => move(-1)}>
              {vi.hotel.previous}
            </button>
            <button className="secondary-button" type="button" onClick={() => move(1)}>
              {vi.hotel.next}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
