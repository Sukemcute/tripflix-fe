'use client';

import { type ReactNode, type RefObject } from 'react';
import { vi } from '@tripflix/i18n';

import {
  formatZoomPercentage,
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
} from './image-zoom';
import { type UseImageZoomReturn } from './use-image-zoom';
import styles from './image-viewer-controls.module.css';

export interface ImageViewerControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  className?: string;
}

export interface ImageZoomSurfaceProps {
  stageRef: RefObject<HTMLDivElement | null>;
  stageClassName?: string;
  zoom: UseImageZoomReturn;
  children: ReactNode;
}

function ExpandGlyph({ isExpanded }: { isExpanded: boolean }) {
  if (isExpanded) {
    return (
      <svg
        className={styles.controlIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 14h6v6" />
        <path d="M20 10h-6V4" />
        <path d="M14 10l7-7" />
        <path d="M3 21l7-7" />
      </svg>
    );
  }

  return (
    <svg
      className={styles.controlIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

/** Shared zoom (100%–400%) and tab-expand control group for image viewers. */
export function ImageViewerControls({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isExpanded,
  onToggleExpanded,
  className,
}: ImageViewerControlsProps) {
  const percent = formatZoomPercentage(scale);
  const canZoomOut = scale > MIN_IMAGE_SCALE;
  const canZoomIn = scale < MAX_IMAGE_SCALE;
  const percentLabel = canZoomOut
    ? vi.api.imageZoomReset
    : vi.api.imageZoomLevel.replace('{percent}', String(percent));
  const expandLabel = isExpanded
    ? vi.api.imageShrinkViewer
    : vi.api.imageExpandViewer;

  return (
    <div className={className ? `${styles.controlsGroup} ${className}` : styles.controlsGroup}>
      <button
        type="button"
        className={styles.controlBtn}
        aria-label={vi.api.imageZoomOut}
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <span aria-hidden="true">−</span>
      </button>

      <button
        type="button"
        className={`${styles.controlBtn} ${styles.percentBtn}`}
        aria-label={percentLabel}
        aria-live="polite"
        disabled={!canZoomOut}
        onClick={onResetZoom}
      >
        {percent}%
      </button>

      <button
        type="button"
        className={styles.controlBtn}
        aria-label={vi.api.imageZoomIn}
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        <span aria-hidden="true">+</span>
      </button>

      <button
        type="button"
        className={styles.controlBtn}
        aria-label={expandLabel}
        aria-pressed={isExpanded}
        onClick={onToggleExpanded}
      >
        <ExpandGlyph isExpanded={isExpanded} />
      </button>
    </div>
  );
}

/** Shared zoomable & pannable stage wrapper attached inside image viewer dialogs. */
export function ImageZoomSurface({
  stageRef,
  stageClassName,
  zoom,
  children,
}: ImageZoomSurfaceProps) {
  const surfaceClasses = [styles.zoomSurface];
  if (zoom.isZoomed) surfaceClasses.push(styles.zoomSurfaceZoomed);
  if (zoom.isInteracting) surfaceClasses.push(styles.zoomSurfaceInteracting);

  return (
    <div
      ref={stageRef}
      className={stageClassName}
      onDoubleClick={zoom.handleStageDoubleClick}
      onPointerDown={zoom.handleStagePointerDown}
      onPointerMove={zoom.handleStagePointerMove}
      onPointerUp={zoom.handleStagePointerUpOrCancel}
      onPointerCancel={zoom.handleStagePointerUpOrCancel}
    >
      <div
        className={surfaceClasses.join(' ')}
        style={{
          transform: `translate3d(${zoom.pan.x}px, ${zoom.pan.y}px, 0) scale(${zoom.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
