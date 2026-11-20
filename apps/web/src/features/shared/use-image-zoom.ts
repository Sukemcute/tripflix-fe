'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import {
  canNavigateSlides,
  clampPanOffset,
  computePinchZoomStep,
  computeWheelZoomScale,
  DOUBLE_TAP_DISTANCE_PX,
  DOUBLE_TAP_WINDOW_MS,
  IMAGE_ZOOM_STEP,
  INITIAL_IMAGE_ZOOM_STATE,
  MIN_IMAGE_SCALE,
  pointerOffsetFromCenter,
  resolveZoomKeyboardAction,
  shouldPreventDialogCancelOnEsc,
  toggleDoubleTapZoom,
  zoomAroundPoint,
  type ImageZoomState,
  type Point2D,
} from './image-zoom';

export interface UseImageZoomOptions {
  isOpen: boolean;
  slideKey: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
}

export interface UseImageZoomReturn {
  scale: number;
  pan: Point2D;
  isZoomed: boolean;
  isInteracting: boolean;
  isFullscreen: boolean;
  canFullscreen: boolean;
  canSwitchSlide: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleFullscreen: () => void;
  handleStageDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handleStagePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleStagePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleStagePointerUpOrCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  shouldPreventEscCancel: () => boolean;
}

type GestureSession =
  | {
      mode: 'drag';
      startPointer: Point2D;
      startPan: Point2D;
    }
  | {
      mode: 'pinch';
      startDistance: number;
      startScale: number;
      startPan: Point2D;
      focalPointFromCenter: Point2D;
    };

const noopSubscribe = () => () => {};

function getClientFullscreenEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenEnabled);
}

function getDistance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getMidpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Shared zoom, pan, pinch, wheel, and fullscreen controller for dialog image viewers. */
export function useImageZoom({
  isOpen,
  slideKey,
  dialogRef,
  stageRef,
}: UseImageZoomOptions): UseImageZoomReturn {
  const scopeKey = isOpen ? slideKey : '__closed__';
  const [zoomEntry, setZoomEntry] = useState<{ scopeKey: string; state: ImageZoomState }>(() => ({
    scopeKey,
    state: INITIAL_IMAGE_ZOOM_STATE,
  }));
  const [interactingScope, setInteractingScope] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    getClientFullscreenEnabled,
    () => false,
  );

  const isInteracting = interactingScope === scopeKey;
  const zoomState = zoomEntry.scopeKey === scopeKey ? zoomEntry.state : INITIAL_IMAGE_ZOOM_STATE;

  const zoomStateRef = useRef<ImageZoomState>(zoomState);
  const activePointersRef = useRef<Map<number, Point2D>>(new Map());
  const gestureRef = useRef<GestureSession | null>(null);
  const lastTapRef = useRef<{ timeMs: number; point: Point2D } | null>(null);
  const wasFullscreenRef = useRef(false);
  const exitedFullscreenAtRef = useRef<number | null>(null);

  useEffect(() => {
    zoomStateRef.current = zoomState;
  });

  useEffect(() => {
    activePointersRef.current.clear();
    gestureRef.current = null;
    lastTapRef.current = null;
  }, [scopeKey]);

  const updateZoom = useCallback(
    (updater: (current: ImageZoomState) => ImageZoomState) => {
      setZoomEntry((prev) => {
        const base = prev.scopeKey === scopeKey ? prev.state : INITIAL_IMAGE_ZOOM_STATE;
        return { scopeKey, state: updater(base) };
      });
    },
    [scopeKey],
  );

  const getStageSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { width: 0, height: 0 };
    const rect = stage.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, [stageRef]);

  const zoomIn = useCallback(() => {
    const stageSize = getStageSize();
    updateZoom((current) =>
      zoomAroundPoint({
        scale: current.scale,
        pan: current.pan,
        nextScale: current.scale + IMAGE_ZOOM_STEP,
        focalPointFromCenter: { x: 0, y: 0 },
        stageSize,
      }),
    );
  }, [getStageSize, updateZoom]);

  const zoomOut = useCallback(() => {
    const stageSize = getStageSize();
    updateZoom((current) =>
      zoomAroundPoint({
        scale: current.scale,
        pan: current.pan,
        nextScale: current.scale - IMAGE_ZOOM_STEP,
        focalPointFromCenter: { x: 0, y: 0 },
        stageSize,
      }),
    );
  }, [getStageSize, updateZoom]);

  const resetZoom = useCallback(() => {
    updateZoom(() => INITIAL_IMAGE_ZOOM_STATE);
  }, [updateZoom]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined' || !document.fullscreenEnabled) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const currentFs = document.fullscreenElement;
    if (currentFs && (currentFs === dialog || dialog.contains(currentFs))) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }

    if (typeof dialog.requestFullscreen === 'function') {
      void dialog.requestFullscreen().catch(() => {});
    }
  }, [dialogRef]);

  const toggleFullscreenRef = useRef(toggleFullscreen);
  const zoomInRef = useRef(zoomIn);
  const zoomOutRef = useRef(zoomOut);
  const resetZoomRef = useRef(resetZoom);

  useEffect(() => {
    toggleFullscreenRef.current = toggleFullscreen;
    zoomInRef.current = zoomIn;
    zoomOutRef.current = zoomOut;
    resetZoomRef.current = resetZoom;
  });

  // Sync fullscreen state and exit fullscreen if the dialog closes.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncFullscreen = () => {
      const dialog = dialogRef.current;
      const fsEl = document.fullscreenElement;
      const active = Boolean(dialog && fsEl && (fsEl === dialog || dialog.contains(fsEl)));
      if (!active && wasFullscreenRef.current) {
        exitedFullscreenAtRef.current = Date.now();
      }
      wasFullscreenRef.current = active;
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    syncFullscreen();

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, [dialogRef]);

  useEffect(() => {
    if (isOpen || typeof document === 'undefined') return;
    const dialog = dialogRef.current;
    const fsEl = document.fullscreenElement;
    if (dialog && fsEl && (fsEl === dialog || dialog.contains(fsEl))) {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, [dialogRef, isOpen]);

  // Attach non-passive wheel zoom listener directly to the stage element.
  useEffect(() => {
    if (!isOpen) return;
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const focalPointFromCenter = pointerOffsetFromCenter(
        { x: event.clientX, y: event.clientY },
        rect,
      );
      const stageSize = { width: rect.width, height: rect.height };

      updateZoom((current) => {
        const nextScale = computeWheelZoomScale(current.scale, event.deltaY);
        return zoomAroundPoint({
          scale: current.scale,
          pan: current.pan,
          nextScale,
          focalPointFromCenter,
          stageSize,
        });
      });
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      stage.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, scopeKey, stageRef, updateZoom]);

  // Bind zoom (+/-/0) and fullscreen (F) keyboard shortcuts and block slide arrows while zoomed.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !canNavigateSlides(zoomStateRef.current.scale)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const action = resolveZoomKeyboardAction(event.key);
      if (!action) return;

      event.preventDefault();
      if (action === 'zoom-in') zoomInRef.current();
      else if (action === 'zoom-out') zoomOutRef.current();
      else if (action === 'reset') resetZoomRef.current();
      else if (action === 'toggle-fullscreen') toggleFullscreenRef.current();
    };

    const handleWindowCaptureKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !canNavigateSlides(zoomStateRef.current.scale)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleWindowCaptureKeyDown, true);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleWindowCaptureKeyDown, true);
    };
  }, [dialogRef, isOpen]);

  const handleStageDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const focalPointFromCenter = pointerOffsetFromCenter(
        { x: event.clientX, y: event.clientY },
        rect,
      );
      const stageSize = { width: rect.width, height: rect.height };

      updateZoom((current) =>
        toggleDoubleTapZoom({
          scale: current.scale,
          focalPointFromCenter,
          stageSize,
        }),
      );
    },
    [stageRef, updateZoom],
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const stage = stageRef.current;
      if (!stage) return;

      const point: Point2D = { x: event.clientX, y: event.clientY };
      activePointersRef.current.set(event.pointerId, point);

      if (activePointersRef.current.size === 2) {
        const pointers = Array.from(activePointersRef.current.values());
        const p1 = pointers[0]!;
        const p2 = pointers[1]!;
        const rect = stage.getBoundingClientRect();
        const midpoint = getMidpoint(p1, p2);
        gestureRef.current = {
          mode: 'pinch',
          startDistance: getDistance(p1, p2),
          startScale: zoomStateRef.current.scale,
          startPan: zoomStateRef.current.pan,
          focalPointFromCenter: pointerOffsetFromCenter(midpoint, rect),
        };
        setInteractingScope(scopeKey);
        return;
      }

      if (activePointersRef.current.size === 1) {
        if (event.pointerType !== 'mouse') {
          const now = Date.now();
          const lastTap = lastTapRef.current;
          if (
            lastTap &&
            now - lastTap.timeMs <= DOUBLE_TAP_WINDOW_MS &&
            getDistance(lastTap.point, point) <= DOUBLE_TAP_DISTANCE_PX
          ) {
            lastTapRef.current = null;
            const rect = stage.getBoundingClientRect();
            const focalPointFromCenter = pointerOffsetFromCenter(point, rect);
            updateZoom((current) =>
              toggleDoubleTapZoom({
                scale: current.scale,
                focalPointFromCenter,
                stageSize: { width: rect.width, height: rect.height },
              }),
            );
            return;
          }
          lastTapRef.current = { timeMs: now, point };
        }

        if (zoomStateRef.current.scale > MIN_IMAGE_SCALE) {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          gestureRef.current = {
            mode: 'drag',
            startPointer: point,
            startPan: zoomStateRef.current.pan,
          };
          setInteractingScope(scopeKey);
        }
      }
    },
    [scopeKey, stageRef, updateZoom],
  );

  const handleStagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activePointersRef.current.has(event.pointerId)) return;
      const point: Point2D = { x: event.clientX, y: event.clientY };
      activePointersRef.current.set(event.pointerId, point);

      const gesture = gestureRef.current;
      const stage = stageRef.current;
      if (!gesture || !stage) return;

      const rect = stage.getBoundingClientRect();
      const stageSize = { width: rect.width, height: rect.height };

      if (gesture.mode === 'pinch' && activePointersRef.current.size >= 2) {
        const pointers = Array.from(activePointersRef.current.values());
        const currentDistance = getDistance(pointers[0]!, pointers[1]!);
        updateZoom(() =>
          computePinchZoomStep({
            startScale: gesture.startScale,
            startPan: gesture.startPan,
            startDistance: gesture.startDistance,
            currentDistance,
            focalPointFromCenter: gesture.focalPointFromCenter,
            stageSize,
          }),
        );
        return;
      }

      if (gesture.mode === 'drag' && activePointersRef.current.size === 1) {
        const dx = point.x - gesture.startPointer.x;
        const dy = point.y - gesture.startPointer.y;
        updateZoom((current) => ({
          scale: current.scale,
          pan: clampPanOffset(
            { x: gesture.startPan.x + dx, y: gesture.startPan.y + dy },
            current.scale,
            stageSize,
          ),
        }));
      }
    },
    [stageRef, updateZoom],
  );

  const handleStagePointerUpOrCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore if pointer capture already released.
      }
    }

    if (activePointersRef.current.size < 2 && gestureRef.current?.mode === 'pinch') {
      gestureRef.current = null;
    }

    if (activePointersRef.current.size === 0) {
      gestureRef.current = null;
      setInteractingScope(null);
    }
  }, []);

  const shouldPreventEscCancel = useCallback(() => {
    return shouldPreventDialogCancelOnEsc({
      hasFullscreenElement: Boolean(typeof document !== 'undefined' && document.fullscreenElement),
      exitedFullscreenAtMs: exitedFullscreenAtRef.current,
      nowMs: Date.now(),
    });
  }, []);

  const isZoomed = zoomState.scale > MIN_IMAGE_SCALE;

  return {
    scale: zoomState.scale,
    pan: zoomState.pan,
    isZoomed,
    isInteracting,
    isFullscreen,
    canFullscreen,
    canSwitchSlide: canNavigateSlides(zoomState.scale),
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    handleStageDoubleClick,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUpOrCancel,
    shouldPreventEscCancel,
  };
}
