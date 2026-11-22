export const MIN_IMAGE_SCALE = 1;
export const MAX_IMAGE_SCALE = 4;
export const IMAGE_ZOOM_STEP = 0.5;
export const DOUBLE_TAP_ZOOM_SCALE = 2;
export const DOUBLE_TAP_WINDOW_MS = 300;
export const DOUBLE_TAP_DISTANCE_PX = 24;

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImageZoomState {
  scale: number;
  pan: Point2D;
}

export const INITIAL_IMAGE_ZOOM_STATE: ImageZoomState = {
  scale: MIN_IMAGE_SCALE,
  pan: { x: 0, y: 0 },
};

export type ZoomKeyboardAction = 'zoom-in' | 'zoom-out' | 'reset' | 'toggle-expanded';

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Clamps zoom factor strictly between 1x and 4x. */
export function clampZoomScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_IMAGE_SCALE;
  const clamped = clampNumber(scale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
  return Math.round(clamped * 1000) / 1000;
}

/** Keeps panning inside scaled stage bounds so image edges cannot drift inward past the viewport. */
export function clampPanOffset(pan: Point2D, scale: number, stageSize: Size2D): Point2D {
  const safeScale = clampZoomScale(scale);
  if (
    safeScale <= MIN_IMAGE_SCALE ||
    !Number.isFinite(stageSize.width) ||
    !Number.isFinite(stageSize.height) ||
    stageSize.width <= 0 ||
    stageSize.height <= 0
  ) {
    return { x: 0, y: 0 };
  }

  const maxX = Math.max(0, (stageSize.width * safeScale - stageSize.width) / 2);
  const maxY = Math.max(0, (stageSize.height * safeScale - stageSize.height) / 2);

  return {
    x: Math.round(clampNumber(pan.x, -maxX, maxX) * 100) / 100,
    y: Math.round(clampNumber(pan.y, -maxY, maxY) * 100) / 100,
  };
}

export function pointerOffsetFromCenter(clientPoint: Point2D, stageRect: RectBox): Point2D {
  return {
    x: clientPoint.x - (stageRect.left + stageRect.width / 2),
    y: clientPoint.y - (stageRect.top + stageRect.height / 2),
  };
}

/** Zooms toward `focalPointFromCenter` while preserving that visual point under the cursor. */
export function zoomAroundPoint(params: {
  scale: number;
  pan: Point2D;
  nextScale: number;
  focalPointFromCenter: Point2D;
  stageSize: Size2D;
}): ImageZoomState {
  const currentScale = clampZoomScale(params.scale);
  const targetScale = clampZoomScale(params.nextScale);

  if (targetScale <= MIN_IMAGE_SCALE) {
    return INITIAL_IMAGE_ZOOM_STATE;
  }

  const ratio = targetScale / currentScale;
  const rawPan = {
    x: params.focalPointFromCenter.x * (1 - ratio) + params.pan.x * ratio,
    y: params.focalPointFromCenter.y * (1 - ratio) + params.pan.y * ratio,
  };

  return {
    scale: targetScale,
    pan: clampPanOffset(rawPan, targetScale, params.stageSize),
  };
}

/** Toggles between 2x at the pointer focal point and 1x reset. */
export function toggleDoubleTapZoom(params: {
  scale: number;
  focalPointFromCenter: Point2D;
  stageSize: Size2D;
}): ImageZoomState {
  if (clampZoomScale(params.scale) > MIN_IMAGE_SCALE) {
    return INITIAL_IMAGE_ZOOM_STATE;
  }

  return zoomAroundPoint({
    scale: MIN_IMAGE_SCALE,
    pan: { x: 0, y: 0 },
    nextScale: DOUBLE_TAP_ZOOM_SCALE,
    focalPointFromCenter: params.focalPointFromCenter,
    stageSize: params.stageSize,
  });
}

/** Converts wheel `deltaY` into a bounded smooth scale factor. */
export function computeWheelZoomScale(currentScale: number, deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return clampZoomScale(currentScale);
  }
  const boundedDelta = clampNumber(deltaY, -240, 240);
  const factor = Math.exp(-boundedDelta * 0.0025);
  return clampZoomScale(clampZoomScale(currentScale) * factor);
}

/** Computes next zoom & pan from a two-finger pinch gesture. */
export function computePinchZoomStep(params: {
  startScale: number;
  startPan: Point2D;
  startDistance: number;
  currentDistance: number;
  focalPointFromCenter: Point2D;
  stageSize: Size2D;
}): ImageZoomState {
  if (
    !Number.isFinite(params.startDistance) ||
    !Number.isFinite(params.currentDistance) ||
    params.startDistance <= 0 ||
    params.currentDistance <= 0
  ) {
    return {
      scale: clampZoomScale(params.startScale),
      pan: clampPanOffset(params.startPan, params.startScale, params.stageSize),
    };
  }

  const nextScale = clampZoomScale(
    clampZoomScale(params.startScale) * (params.currentDistance / params.startDistance),
  );

  return zoomAroundPoint({
    scale: params.startScale,
    pan: params.startPan,
    nextScale,
    focalPointFromCenter: params.focalPointFromCenter,
    stageSize: params.stageSize,
  });
}

/** Prevents accidental slide switching while zoomed in past 100%. */
export function canNavigateSlides(scale: number): boolean {
  return clampZoomScale(scale) <= MIN_IMAGE_SCALE;
}

export function resolveZoomKeyboardAction(key: string): ZoomKeyboardAction | null {
  if (key === '+' || key === '=') return 'zoom-in';
  if (key === '-' || key === '_') return 'zoom-out';
  if (key === '0') return 'reset';
  if (key === 'f' || key === 'F') return 'toggle-expanded';
  return null;
}

/** Handles Escape (`cancel` event): shrinks expanded viewer first without closing the dialog. */
export function handleExpandedDialogCancel(params: {
  isExpanded: boolean;
  onShrinkExpanded: () => void;
  onClose?: () => void;
}): 'shrunk' | 'closed' {
  if (params.isExpanded) {
    params.onShrinkExpanded();
    return 'shrunk';
  }
  params.onClose?.();
  return 'closed';
}

export function formatZoomPercentage(scale: number): number {
  return Math.round(clampZoomScale(scale) * 100);
}
