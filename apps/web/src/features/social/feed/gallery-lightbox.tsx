'use client';

import Image from 'next/image';
import { type ReactNode, useEffect, useRef } from 'react';
import { vi } from '@tripflix/i18n';
import reelsStyles from '../live-posts.module.css';

export interface GalleryBoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GalleryBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GalleryImageElementLike {
  getBoundingClientRect: () => GalleryBoxRect;
  naturalWidth: number;
  naturalHeight: number;
}

export interface GalleryDialogLike {
  open: boolean;
  showModal: () => void;
  close: () => void;
}

export interface GalleryTargetLike {
  closest?: (selector: string) => unknown;
}

/**
 * Tính hình chữ nhật phần ảnh thật sự hiển thị bên trong phần tử dùng `object-fit: contain`
 * (loại trừ viền trống hai bên hoặc trên dưới khi tỉ lệ ảnh khác tỉ lệ khung).
 */
export function getContainImageRect(
  box: GalleryBoxRect,
  naturalWidth: number,
  naturalHeight: number,
): GalleryBounds {
  if (box.width <= 0 || box.height <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return {
      left: box.left,
      top: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
    };
  }
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const offsetX = (box.width - renderedWidth) / 2;
  const offsetY = (box.height - renderedHeight) / 2;
  return {
    left: box.left + offsetX,
    top: box.top + offsetY,
    right: box.left + offsetX + renderedWidth,
    bottom: box.top + offsetY + renderedHeight,
  };
}

/** Kiểm tra toạ độ con trỏ có nằm trong vùng ảnh thật (không phải viền trống xung quanh) hay không. */
export function isPointInsideContainImage(
  point: { x: number; y: number },
  box: GalleryBoxRect,
  naturalWidth: number,
  naturalHeight: number,
): boolean {
  const bounds = getContainImageRect(box, naturalWidth, naturalHeight);
  return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

/** Quyết định có đóng khung xem ảnh khi click hay không: mọi nơi ngoài ảnh thật và nút điều khiển đều đóng. */
export function shouldCloseGalleryFromClick({
  target,
  clientX,
  clientY,
  detail = 1,
  imageEl,
}: {
  target: EventTarget | GalleryTargetLike | null;
  clientX: number;
  clientY: number;
  detail?: number;
  imageEl: GalleryImageElementLike | null;
}): boolean {
  // Nhấn phím Enter/Space kích hoạt click có detail === 0: không coi là bấm nền.
  if (detail === 0) return false;
  const elementTarget = target as GalleryTargetLike | null;
  if (typeof elementTarget?.closest === 'function') {
    if (elementTarget.closest('[data-gallery-keep-open="true"]')) return false;
    // Nút đóng tự gọi onClose ở handler riêng.
    if (elementTarget.closest('[data-gallery-close="true"]')) return false;
  }
  if (!imageEl || target !== (imageEl as unknown)) return true;
  return !isPointInsideContainImage(
    { x: clientX, y: clientY },
    imageEl.getBoundingClientRect(),
    imageEl.naturalWidth,
    imageEl.naturalHeight,
  );
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
  label: string;
  imageSrc?: string;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  closeIcon?: ReactNode;
  prevIcon?: ReactNode;
  nextIcon?: ReactNode;
}

export function GalleryLightbox({
  isOpen,
  label,
  imageSrc,
  currentIndex,
  total,
  onClose,
  onPrev,
  onNext,
  closeIcon,
  prevIcon,
  nextIcon,
}: GalleryLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
        shouldCloseGalleryFromClick({
          target: event.target,
          clientX: event.clientX,
          clientY: event.clientY,
          detail: event.detail,
          imageEl: imgRef.current,
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

  return (
    <dialog
      ref={dialogRef}
      className={reelsStyles.galleryStageOverlay}
      aria-modal="true"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      {isOpen && imageSrc && (
        <div className={reelsStyles.galleryFrame}>
          <div className={reelsStyles.galleryTopBar}>
            <span className={reelsStyles.galleryCountPill} data-gallery-keep-open="true">
              {currentIndex + 1} / {total}
            </span>
            <button
              type="button"
              className={reelsStyles.galleryCloseBtn}
              data-gallery-close="true"
              aria-label={vi.api.immersiveCloseGallery}
              data-tooltip={vi.api.immersiveCloseGallery}
              onClick={onClose}
            >
              {closeIcon ?? '×'}
            </button>
          </div>

          <div className={reelsStyles.galleryContainFrame}>
            <Image
              ref={imgRef}
              key={imageSrc}
              src={imageSrc}
              alt={label}
              width={0}
              height={0}
              sizes="(max-width: 767px) 92vw, 960px"
              className={reelsStyles.galleryContainImg}
              priority
              unoptimized={imageSrc.startsWith('http')}
            />
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                className={`${reelsStyles.gallerySlideNavBtn} ${reelsStyles.gallerySlidePrev}`}
                data-gallery-keep-open="true"
                disabled={currentIndex <= 0}
                aria-label={vi.api.immersivePrevSlide}
                data-tooltip={vi.api.immersivePrevSlide}
                onClick={onPrev}
              >
                {prevIcon ?? '‹'}
              </button>
              <button
                type="button"
                className={`${reelsStyles.gallerySlideNavBtn} ${reelsStyles.gallerySlideNext}`}
                data-gallery-keep-open="true"
                disabled={currentIndex >= total - 1}
                aria-label={vi.api.immersiveNextSlide}
                data-tooltip={vi.api.immersiveNextSlide}
                onClick={onNext}
              >
                {nextIcon ?? '›'}
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
