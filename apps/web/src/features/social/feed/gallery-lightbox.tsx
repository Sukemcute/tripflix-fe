'use client';

import Image from 'next/image';
import { type ReactNode, useEffect, useRef } from 'react';
import { vi } from '@tripflix/i18n';
import { isOptimizedImageUrl } from '../../../lib/remote-images';
import {
  ImageViewerControls,
  ImageZoomSurface,
} from '../../shared/image-viewer-controls';
import { handleExpandedDialogCancel } from '../../shared/image-zoom';
import { useImageZoom } from '../../shared/use-image-zoom';
import reelsStyles from '../live-posts.module.css';

export interface GalleryImageItem {
  src: string;
  alt?: string;
}

export interface GalleryDialogLike {
  open: boolean;
  showModal: () => void;
  close: () => void;
}

/** Giới hạn chỉ số ảnh trong [0, total - 1]; trả 0 nếu danh sách rỗng hoặc giá trị không hợp lệ. */
export function clampGalleryIndex(index: number, total: number): number {
  if (total <= 0 || !Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(total - 1, Math.trunc(index)));
}

/** Tính chỉ số kế tiếp khi bấm nút trước/sau hoặc nhấn mũi tên trái/phải. */
export function stepGalleryIndex(currentIndex: number, delta: number, total: number): number {
  return clampGalleryIndex(clampGalleryIndex(currentIndex, total) + delta, total);
}

/**
 * Đóng hộp thoại khi người dùng bấm đúng ra phần nền tối (`::backdrop`, nơi `event.target === dialog`),
 * không đóng khi bấm vào bất kỳ thành phần nào bên trong khung xem ảnh hay kích hoạt bằng bàn phím.
 */
export function shouldCloseGalleryBackdropClick({
  target,
  dialog,
  detail = 1,
}: {
  target: EventTarget | null;
  dialog: EventTarget | null;
  detail?: number;
}): boolean {
  return detail !== 0 && dialog !== null && target === dialog;
}

/** Đồng bộ trạng thái `<dialog>` top layer theo boolean `isOpen`. */
export function syncGalleryDialogState(dialog: GalleryDialogLike | null, isOpen: boolean): void {
  if (!dialog) return;
  if (isOpen && !dialog.open) {
    dialog.showModal();
  } else if (!isOpen && dialog.open) {
    dialog.close();
  }
}

export interface GalleryLightboxProps {
  isOpen: boolean;
  title: string;
  images: readonly GalleryImageItem[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  closeIcon?: ReactNode;
  prevIcon?: ReactNode;
  nextIcon?: ReactNode;
}

export function GalleryLightbox({
  isOpen,
  title,
  images,
  currentIndex,
  onClose,
  onSelectIndex,
  closeIcon,
  prevIcon,
  nextIcon,
}: GalleryLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  const total = images.length;
  const safeIndex = clampGalleryIndex(currentIndex, total);
  const activeImage = images[safeIndex];
  const displayTitle = title.trim() || vi.hotel.gallery;
  const zoom = useImageZoom({
    isOpen: Boolean(isOpen && activeImage),
    slideKey: `${safeIndex}:${activeImage?.src ?? ''}`,
    dialogRef,
    stageRef,
  });

  const shrinkExpanded = zoom.shrinkExpanded;
  const closeViewer = () => {
    shrinkExpanded();
    onClose();
  };

  useEffect(() => {
    onCloseRef.current = () => {
      shrinkExpanded();
      onClose();
    };
  }, [onClose, shrinkExpanded]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      syncGalleryDialogState(dialog, false);
      return;
    }

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    syncGalleryDialogState(dialog, true);

    const handleClick = (event: MouseEvent) => {
      if (
        shouldCloseGalleryBackdropClick({
          target: event.target,
          dialog,
          detail: event.detail,
        })
      ) {
        onCloseRef.current();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
      }
    };

    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('keydown', handleKeyDown);

    return () => {
      dialog.removeEventListener('click', handleClick);
      dialog.removeEventListener('keydown', handleKeyDown);
      syncGalleryDialogState(dialog, false);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (previousActive && previousActive.isConnected) {
        previousActive.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dialogRef.current?.open) {
      activeThumbRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [isOpen, safeIndex]);

  return (
    <dialog
      ref={dialogRef}
      className={reelsStyles.galleryStageOverlay}
      data-expanded={zoom.isExpanded ? 'true' : undefined}
      aria-modal="true"
      aria-label={`${vi.hotel.gallery}: ${displayTitle}`}
      onCancel={(event) => {
        event.preventDefault();
        handleExpandedDialogCancel({
          isExpanded: zoom.isExpanded,
          onShrinkExpanded: zoom.shrinkExpanded,
          onClose: onCloseRef.current,
        });
      }}
      onClose={closeViewer}
    >
      {isOpen && activeImage && (
        <div className={reelsStyles.galleryViewer}>
          <header className={reelsStyles.galleryHeader}>
            <div className={reelsStyles.galleryHeaderText}>
              <strong className={reelsStyles.galleryHeaderTitle}>{displayTitle}</strong>
              <output className={reelsStyles.galleryCountOutput}>
                {safeIndex + 1} / {total}
              </output>
            </div>
            <div className={reelsStyles.galleryHeaderActions}>
              <ImageViewerControls
                scale={zoom.scale}
                onZoomIn={zoom.zoomIn}
                onZoomOut={zoom.zoomOut}
                onResetZoom={zoom.resetZoom}
                isExpanded={zoom.isExpanded}
                onToggleExpanded={zoom.toggleExpanded}
              />
              <button
                type="button"
                className={reelsStyles.galleryControl}
                aria-label={vi.api.immersiveCloseGallery}
                data-tooltip={vi.api.immersiveCloseGallery}
                onClick={closeViewer}
              >
                {closeIcon ?? '×'}
              </button>
            </div>
          </header>

          <ImageZoomSurface stageRef={stageRef} stageClassName={reelsStyles.galleryStage} zoom={zoom}>
            <Image
              key={activeImage.src}
              src={activeImage.src}
              alt={activeImage.alt ?? `${displayTitle} · ${vi.hotel.photo} ${safeIndex + 1}`}
              width={zoom.isZoomed ? 2000 : 1000}
              height={zoom.isZoomed ? 1400 : 700}
              sizes={zoom.isZoomed ? '100vw' : '(max-width: 768px) 100vw, 60vw'}
              className={reelsStyles.galleryContainImg}
              draggable={false}
              priority
              unoptimized={activeImage.src.startsWith('http') && !isOptimizedImageUrl(activeImage.src)}
            />
          </ImageZoomSurface>

          {total > 1 && (
            <div className={reelsStyles.galleryNavigation}>
              <button
                type="button"
                className={reelsStyles.galleryControl}
                disabled={safeIndex <= 0}
                aria-label={vi.api.immersivePrevSlide}
                data-tooltip={vi.api.immersivePrevSlide}
                onClick={() => onSelectIndex(stepGalleryIndex(safeIndex, -1, total))}
              >
                {prevIcon ?? '‹'}
              </button>

              <div className={reelsStyles.galleryThumbnails}>
                {images.map((item, position) => {
                  const isActive = position === safeIndex;
                  return (
                    <button
                      type="button"
                      key={`${item.src}-${position}`}
                      ref={isActive ? activeThumbRef : undefined}
                      className={reelsStyles.galleryThumbBtn}
                      aria-label={`${vi.hotel.photo} ${position + 1}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => onSelectIndex(position)}
                    >
                      <span aria-hidden="true">{position + 1}</span>
                      <Image
                        src={item.src}
                        alt=""
                        width={128}
                        height={96}
                        sizes="64px"
                        className={reelsStyles.galleryThumbImg}
                        unoptimized={item.src.startsWith('http')}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={reelsStyles.galleryControl}
                disabled={safeIndex >= total - 1}
                aria-label={vi.api.immersiveNextSlide}
                data-tooltip={vi.api.immersiveNextSlide}
                onClick={() => onSelectIndex(stepGalleryIndex(safeIndex, 1, total))}
              >
                {nextIcon ?? '›'}
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
