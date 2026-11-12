'use client';

import React, { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { SocialIcon } from '../live-posts';
import styles from './social-feed.module.css';

export interface PostImageItem {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface AdaptivePostMediaProps {
  postTitle: string;
  images: PostImageItem[];
  videoUrl?: string;
  videoPoster?: string | null;
  onOpenGallery?: (initialIndex: number) => void;
}

export function AdaptivePostMedia({
  postTitle,
  images,
  videoUrl,
  videoPoster,
  onOpenGallery,
}: AdaptivePostMediaProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  }, []);

  // Truong hop 1: Video
  if (videoUrl) {
    return (
      <div className={styles.mediaGridWrap}>
        <div className={styles.mediaVideoWrap}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={videoPoster ?? undefined}
            className={styles.inlineVideoEl}
            preload="none"
            playsInline
            loop
            muted={isMuted}
            onClick={togglePlay}
          >
            <track kind="captions" />
          </video>
          <div className={styles.videoControlsOverlay}>
            <button
              type="button"
              className={styles.videoOverlayBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Tam dung video' : 'Phat video'}
            >
              <SocialIcon name={isPlaying ? 'pause' : 'play'} size={20} />
            </button>
            <button
              type="button"
              className={styles.videoOverlayBtn}
              onClick={toggleMute}
              aria-label={isMuted ? 'Bat tieng' : 'Tat tieng'}
            >
              <SocialIcon name={isMuted ? 'volumeOff' : 'volumeOn'} size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Khong co media
  const total = images.length;
  if (total === 0) {
    return null;
  }

  // Truong hop 2: 1 anh lon duy nhat
  if (total === 1) {
    const img = images[0]!;
    return (
      <div className={styles.mediaGridWrap}>
        <button
          type="button"
          className={styles.mediaSingleImg}
          onClick={() => onOpenGallery?.(0)}
          aria-label="Xem anh phong to"
        >
          <Image
            src={img.src}
            alt={img.alt ?? postTitle}
            fill
            className={styles.mediaImg}
            sizes="(max-width: 768px) 100vw, 840px"
            unoptimized={img.src.startsWith('http')}
          />
        </button>
      </div>
    );
  }

  // Truong hop 3: 2 anh chia doi
  if (total === 2) {
    return (
      <div className={styles.mediaGridWrap}>
        <div className={styles.mediaTwoGrid}>
          {images.map((img, idx) => (
            <button
              key={img.src}
              type="button"
              className={styles.mediaCell}
              onClick={() => onOpenGallery?.(idx)}
              aria-label={`Xem anh ${idx + 1}`}
            >
              <Image
                src={img.src}
                alt={img.alt ?? postTitle}
                fill
                className={styles.mediaImg}
                sizes="(max-width: 768px) 50vw, 420px"
                unoptimized={img.src.startsWith('http')}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Truong hop 4: 3 anh (1 lon ben trai, 2 chong len nhau ben phai)
  if (total === 3) {
    const [lead, top, bottom] = images;
    return (
      <div className={styles.mediaGridWrap}>
        <div className={styles.mediaThreeGrid}>
          {lead && (
            <button
              type="button"
              className={styles.mediaCell}
              onClick={() => onOpenGallery?.(0)}
              aria-label="Xem anh 1"
            >
              <Image
                src={lead.src}
                alt={lead.alt ?? postTitle}
                fill
                className={styles.mediaImg}
                sizes="(max-width: 768px) 66vw, 560px"
                unoptimized={lead.src.startsWith('http')}
              />
            </button>
          )}
          <div className={styles.mediaThreeRightStack}>
            {top && (
              <button
                type="button"
                className={styles.mediaCell}
                onClick={() => onOpenGallery?.(1)}
                aria-label="Xem anh 2"
              >
                <Image
                  src={top.src}
                  alt={top.alt ?? postTitle}
                  fill
                  className={styles.mediaImg}
                  sizes="(max-width: 768px) 34vw, 280px"
                  unoptimized={top.src.startsWith('http')}
                />
              </button>
            )}
            {bottom && (
              <button
                type="button"
                className={styles.mediaCell}
                onClick={() => onOpenGallery?.(2)}
                aria-label="Xem anh 3"
              >
                <Image
                  src={bottom.src}
                  alt={bottom.alt ?? postTitle}
                  fill
                  className={styles.mediaImg}
                  sizes="(max-width: 768px) 34vw, 280px"
                  unoptimized={bottom.src.startsWith('http')}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Truong hop 5: 4 anh hoac 5+ anh (Grid 4 o, o thu 4 co overlay +N, vi du 5 anh hien thi 3 o thuong va o thu 4 co +2)
  const displayImages = images.slice(0, 4);
  const remainingCount = total > 4 ? total - 3 : 0;

  return (
    <div className={styles.mediaGridWrap}>
      <div className={styles.mediaFourGrid}>
        {displayImages.map((img, idx) => {
          const isLastCell = idx === 3 && remainingCount > 0;
          return (
            <button
              key={img.src}
              type="button"
              className={styles.mediaCell}
              onClick={() => onOpenGallery?.(idx)}
              aria-label={`Xem anh ${idx + 1}`}
            >
              <Image
                src={img.src}
                alt={img.alt ?? postTitle}
                fill
                className={styles.mediaImg}
                sizes="(max-width: 768px) 50vw, 420px"
                unoptimized={img.src.startsWith('http')}
              />
              {isLastCell && (
                <div className={styles.mediaOverlayMore} aria-hidden="true">
                  +{remainingCount}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

