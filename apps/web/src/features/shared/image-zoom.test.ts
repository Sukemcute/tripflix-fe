import { describe, expect, it } from 'vitest';

import {
  canNavigateSlides,
  clampPanOffset,
  clampZoomScale,
  computePinchZoomStep,
  computeWheelZoomScale,
  formatZoomPercentage,
  INITIAL_IMAGE_ZOOM_STATE,
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  pointerOffsetFromCenter,
  resolveZoomKeyboardAction,
  shouldPreventDialogCancelOnEsc,
  toggleDoubleTapZoom,
  zoomAroundPoint,
} from './image-zoom';

describe('image-zoom helpers', () => {
  it('clamps zoom scale strictly between 1x and 4x', () => {
    expect(clampZoomScale(0.25)).toBe(MIN_IMAGE_SCALE);
    expect(clampZoomScale(1)).toBe(1);
    expect(clampZoomScale(2.3456)).toBe(2.346);
    expect(clampZoomScale(6)).toBe(MAX_IMAGE_SCALE);
    expect(clampZoomScale(Number.NaN)).toBe(1);
  });

  it('clamps pan offset within scaled stage bounds and resets to 0 at 1x', () => {
    const stageSize = { width: 800, height: 600 };

    expect(clampPanOffset({ x: 120, y: -80 }, 1, stageSize)).toEqual({ x: 0, y: 0 });
    // At 2x, maxX = (1600 - 800) / 2 = 400, maxY = (1200 - 600) / 2 = 300
    expect(clampPanOffset({ x: 999, y: -999 }, 2, stageSize)).toEqual({ x: 400, y: -300 });
    expect(clampPanOffset({ x: 150, y: -120 }, 2, stageSize)).toEqual({ x: 150, y: -120 });
  });

  it('zooms around pointer focal point and preserves that point under cursor', () => {
    const stageRect = { left: 100, top: 50, width: 1000, height: 600 };
    const focalPointFromCenter = pointerOffsetFromCenter({ x: 850, y: 350 }, stageRect);
    expect(focalPointFromCenter).toEqual({ x: 250, y: 0 });

    const zoomed = zoomAroundPoint({
      scale: 1,
      pan: { x: 0, y: 0 },
      nextScale: 2,
      focalPointFromCenter,
      stageSize: { width: 1000, height: 600 },
    });

    expect(zoomed.scale).toBe(2);
    expect(zoomed.pan).toEqual({ x: -250, y: 0 });

    const reset = zoomAroundPoint({
      scale: zoomed.scale,
      pan: zoomed.pan,
      nextScale: 0.8,
      focalPointFromCenter,
      stageSize: { width: 1000, height: 600 },
    });

    expect(reset).toEqual(INITIAL_IMAGE_ZOOM_STATE);
  });

  it('toggles between 2x at tap point and 1x reset on double-click / double-tap', () => {
    const stageSize = { width: 800, height: 600 };
    const zoomIn = toggleDoubleTapZoom({
      scale: 1,
      focalPointFromCenter: { x: 100, y: -50 },
      stageSize,
    });
    expect(zoomIn).toEqual({ scale: 2, pan: { x: -100, y: 50 } });

    const zoomOut = toggleDoubleTapZoom({
      scale: zoomIn.scale,
      focalPointFromCenter: { x: 0, y: 0 },
      stageSize,
    });
    expect(zoomOut).toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });

  it('computes bounded wheel zoom and pinch zoom steps', () => {
    const zoomedIn = computeWheelZoomScale(1, -120);
    expect(zoomedIn).toBeGreaterThan(1);
    expect(zoomedIn).toBeLessThanOrEqual(4);

    expect(computeWheelZoomScale(1, 120)).toBe(1);

    const pinched = computePinchZoomStep({
      startScale: 1,
      startPan: { x: 0, y: 0 },
      startDistance: 100,
      currentDistance: 250,
      focalPointFromCenter: { x: 0, y: 0 },
      stageSize: { width: 800, height: 600 },
    });
    expect(pinched).toEqual({ scale: 2.5, pan: { x: 0, y: 0 } });
  });

  it('locks slide navigation while zoomed and maps keyboard zoom/fullscreen keys', () => {
    expect(canNavigateSlides(1)).toBe(true);
    expect(canNavigateSlides(1.5)).toBe(false);
    expect(formatZoomPercentage(2.35)).toBe(235);

    expect(resolveZoomKeyboardAction('+')).toBe('zoom-in');
    expect(resolveZoomKeyboardAction('=')).toBe('zoom-in');
    expect(resolveZoomKeyboardAction('-')).toBe('zoom-out');
    expect(resolveZoomKeyboardAction('0')).toBe('reset');
    expect(resolveZoomKeyboardAction('f')).toBe('toggle-fullscreen');
    expect(resolveZoomKeyboardAction('F')).toBe('toggle-fullscreen');
    expect(resolveZoomKeyboardAction('ArrowRight')).toBeNull();
  });

  it('prevents closing dialog on Escape when fullscreen is active or just exited', () => {
    expect(
      shouldPreventDialogCancelOnEsc({
        hasFullscreenElement: true,
        exitedFullscreenAtMs: null,
        nowMs: 1000,
      }),
    ).toBe(true);

    expect(
      shouldPreventDialogCancelOnEsc({
        hasFullscreenElement: false,
        exitedFullscreenAtMs: 900,
        nowMs: 1000,
      }),
    ).toBe(true);

    expect(
      shouldPreventDialogCancelOnEsc({
        hasFullscreenElement: false,
        exitedFullscreenAtMs: 500,
        nowMs: 1000,
      }),
    ).toBe(false);
  });
});
