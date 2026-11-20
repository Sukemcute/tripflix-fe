import { afterEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  const states: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  const callbacks: Array<{ fn: unknown; deps?: readonly unknown[] }> = [];
  const effects: Array<{
    effect: () => void | (() => void);
    cleanup?: () => void;
    deps?: readonly unknown[];
  }> = [];
  let stateCursor = 0;
  let refCursor = 0;
  let callbackCursor = 0;
  let effectCursor = 0;

  return {
    reset() {
      for (const entry of effects) entry.cleanup?.();
      states.length = 0;
      refs.length = 0;
      callbacks.length = 0;
      effects.length = 0;
      stateCursor = 0;
      refCursor = 0;
      callbackCursor = 0;
      effectCursor = 0;
    },
    beginRender() {
      stateCursor = 0;
      refCursor = 0;
      callbackCursor = 0;
      effectCursor = 0;
    },
    flushEffects() {
      for (const entry of effects) {
        if (!entry.cleanup && entry.deps === undefined) {
          entry.cleanup = entry.effect() ?? undefined;
        }
      }
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
      const idx = stateCursor++;
      if (!(idx in states)) {
        states[idx] = typeof initial === 'function' ? (initial as () => T)() : initial;
      }
      return [
        states[idx] as T,
        (next) => {
          states[idx] =
            typeof next === 'function' ? (next as (prev: T) => T)(states[idx] as T) : next;
        },
      ];
    },
    useRef<T>(initial: T): { current: T } {
      const idx = refCursor++;
      if (!(idx in refs)) refs[idx] = { current: initial };
      return refs[idx] as { current: T };
    },
    useCallback<T>(fn: T, deps?: readonly unknown[]): T {
      const idx = callbackCursor++;
      const prev = callbacks[idx];
      const changed =
        !prev ||
        !deps ||
        !prev.deps ||
        deps.length !== prev.deps.length ||
        deps.some((d, i) => !Object.is(d, prev.deps![i]));
      if (changed) callbacks[idx] = { fn, deps };
      return callbacks[idx]!.fn as T;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const idx = effectCursor++;
      const prev = effects[idx];
      const changed =
        !prev ||
        !deps ||
        !prev.deps ||
        deps.length !== prev.deps.length ||
        deps.some((d, i) => !Object.is(d, prev.deps![i]));
      if (changed) {
        prev?.cleanup?.();
        const cleanup = effect() ?? undefined;
        effects[idx] = { effect, cleanup, deps };
      }
    },
  };
});

vi.mock('react', () => ({
  useState: runtime.useState,
  useRef: runtime.useRef,
  useCallback: runtime.useCallback,
  useEffect: runtime.useEffect,
}));

import { handleExpandedDialogCancel } from './image-zoom';
import { useImageZoom } from './use-image-zoom';

class FakeEventTarget {
  private listeners = new Map<string, Array<{ fn: (e: unknown) => void; capture: boolean }>>();

  addEventListener(type: string, fn: (e: unknown) => void, options?: boolean | { capture?: boolean }) {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const list = this.listeners.get(type) ?? [];
    list.push({ fn, capture });
    this.listeners.set(type, list);
  }

  removeEventListener(
    type: string,
    fn: (e: unknown) => void,
    options?: boolean | { capture?: boolean },
  ) {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((entry) => entry.fn !== fn || entry.capture !== capture),
    );
  }

  dispatch(type: string, event: Record<string, unknown>, captureOnly = false) {
    for (const entry of this.listeners.get(type) ?? []) {
      if (captureOnly && !entry.capture) continue;
      entry.fn(event);
    }
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1000, height: 700 };
  }
}

describe('useImageZoom tab-expanded & keyboard behavior', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    runtime.reset();
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('toggles expanded state via button and F key, shrinks on 1st Esc, closes on 2nd Esc, and resets when reopened', () => {
    const fakeWindow = new FakeEventTarget();
    Object.defineProperty(globalThis, 'window', {
      value: fakeWindow,
      configurable: true,
      writable: true,
    });

    const dialogTarget = new FakeEventTarget();
    const stageTarget = new FakeEventTarget();
    const dialogRef = { current: dialogTarget as unknown as HTMLDialogElement };
    const stageRef = { current: stageTarget as unknown as HTMLDivElement };

    const renderHook = (isOpen: boolean, slideKey = '0:a.jpg') => {
      runtime.beginRender();
      const result = useImageZoom({ isOpen, slideKey, dialogRef, stageRef });
      runtime.flushEffects();
      return result;
    };

    let hook = renderHook(true);
    expect(hook.isExpanded).toBe(false);

    // Toggle via button
    hook.toggleExpanded();
    hook = renderHook(true);
    expect(hook.isExpanded).toBe(true);

    // 1st Escape -> shrinks without closing dialog
    let closedCount = 0;
    const esc1 = handleExpandedDialogCancel({
      isExpanded: hook.isExpanded,
      onShrinkExpanded: hook.shrinkExpanded,
      onClose: () => {
        closedCount += 1;
      },
    });
    expect(esc1).toBe('shrunk');
    expect(closedCount).toBe(0);

    hook = renderHook(true);
    expect(hook.isExpanded).toBe(false);

    // Toggle via F key
    const preventDefault = vi.fn();
    dialogTarget.dispatch('keydown', {
      key: 'f',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      target: null,
      preventDefault,
      stopPropagation: vi.fn(),
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);

    hook = renderHook(true);
    expect(hook.isExpanded).toBe(true);

    // Zoom + and block ArrowRight at scale > 1
    hook.zoomIn();
    hook = renderHook(true);
    expect(hook.scale).toBe(1.5);
    expect(hook.canSwitchSlide).toBe(false);

    const arrowPrevent = vi.fn();
    const arrowStop = vi.fn();
    fakeWindow.dispatch(
      'keydown',
      {
        key: 'ArrowRight',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: null,
        preventDefault: arrowPrevent,
        stopPropagation: arrowStop,
      },
      true,
    );
    expect(arrowPrevent).toHaveBeenCalledTimes(1);
    expect(arrowStop).toHaveBeenCalledTimes(1);

    // Close (without manual shrinkExpanded) and reopen same slideKey -> back to normal size & 100%
    hook = renderHook(false);
    expect(hook.isExpanded).toBe(false);
    expect(hook.scale).toBe(1);

    hook = renderHook(true);
    expect(hook.isExpanded).toBe(false);
    expect(hook.scale).toBe(1);
  });
});
