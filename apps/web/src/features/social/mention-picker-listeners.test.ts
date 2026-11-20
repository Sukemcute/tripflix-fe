import { afterEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  const states: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  const memos: Array<{ value: unknown; deps?: readonly unknown[] }> = [];
  const callbacks: Array<{ fn: unknown; deps?: readonly unknown[] }> = [];
  const effects: Array<{
    effect: () => void | (() => void);
    cleanup?: () => void;
    deps?: readonly unknown[];
  }> = [];
  let stateCursor = 0;
  let refCursor = 0;
  let memoCursor = 0;
  let callbackCursor = 0;
  let effectCursor = 0;

  return {
    reset() {
      for (const entry of effects) entry.cleanup?.();
      states.length = 0;
      refs.length = 0;
      memos.length = 0;
      callbacks.length = 0;
      effects.length = 0;
      stateCursor = 0;
      refCursor = 0;
      memoCursor = 0;
      callbackCursor = 0;
      effectCursor = 0;
    },
    beginRender() {
      stateCursor = 0;
      refCursor = 0;
      memoCursor = 0;
      callbackCursor = 0;
      effectCursor = 0;
    },
    flushEffects() {
      for (const entry of effects) {
        if (!entry.cleanup && entry.deps === undefined) {
          // Effect không có mảng deps -> chạy lại sau mỗi render (cập nhật latestRef)
          entry.cleanup = entry.effect() ?? undefined;
        }
      }
    },
    useState<T>(initial: T): [T, (next: T) => void] {
      const idx = stateCursor++;
      if (!(idx in states)) states[idx] = initial;
      return [
        states[idx] as T,
        (next: T) => {
          states[idx] = typeof next === 'function' ? (next as (prev: T) => T)(states[idx] as T) : next;
        },
      ];
    },
    useRef<T>(initial: T): { current: T } {
      const idx = refCursor++;
      if (!(idx in refs)) refs[idx] = { current: initial };
      return refs[idx] as { current: T };
    },
    useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
      const idx = memoCursor++;
      const prev = memos[idx];
      const changed =
        !prev || !deps || !prev.deps || deps.length !== prev.deps.length || deps.some((d, i) => !Object.is(d, prev.deps![i]));
      if (changed) {
        memos[idx] = { value: factory(), deps };
      }
      return memos[idx]!.value as T;
    },
    useCallback<T>(fn: T, deps?: readonly unknown[]): T {
      const idx = callbackCursor++;
      const prev = callbacks[idx];
      const changed =
        !prev || !deps || !prev.deps || deps.length !== prev.deps.length || deps.some((d, i) => !Object.is(d, prev.deps![i]));
      if (changed) {
        callbacks[idx] = { fn, deps };
      }
      return callbacks[idx]!.fn as T;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const idx = effectCursor++;
      const prev = effects[idx];
      if (!prev) {
        const cleanup = effect() ?? undefined;
        effects[idx] = { effect, cleanup, deps };
        return;
      }
      const changed =
        !deps ||
        !prev.deps ||
        deps.length !== prev.deps.length ||
        deps.some((d, i) => !Object.is(d, prev.deps![i]));
      if (changed) {
        prev.cleanup?.();
        const cleanup = effect() ?? undefined;
        effects[idx] = { effect, cleanup, deps };
      }
    },
    unmount() {
      for (const entry of effects) {
        entry.cleanup?.();
        entry.cleanup = undefined;
      }
    },
  };
});

const apiMocks = vi.hoisted(() => ({
  useUserSearch: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    default: {
      ...((actual as typeof actual & { default?: typeof actual }).default ?? actual),
      useState: runtime.useState,
      useRef: runtime.useRef,
      useMemo: runtime.useMemo,
      useCallback: runtime.useCallback,
      useEffect: runtime.useEffect,
    },
    useState: runtime.useState,
    useRef: runtime.useRef,
    useMemo: runtime.useMemo,
    useCallback: runtime.useCallback,
    useEffect: runtime.useEffect,
  };
});

vi.mock('@tripflix/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tripflix/api-client')>();
  return {
    ...actual,
    useUserSearch: apiMocks.useUserSearch,
  };
});

import { MentionPicker } from './mention-picker';

afterEach(() => {
  runtime.reset();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('MentionPicker document listeners gắn đúng 1 lần và luôn gọi callback mới nhất', () => {
  it('đổi props onClose, onSelect, users nhiều lần không gỡ/gắn lại document listener', () => {
    const mousedownListeners = new Set<(event: MouseEvent) => void>();
    const keydownListeners = new Set<(event: KeyboardEvent) => void>();

    const addEventListener = vi.fn((type: string, fn: EventListenerOrEventListenerObject) => {
      if (type === 'mousedown') mousedownListeners.add(fn as (e: MouseEvent) => void);
      if (type === 'keydown') keydownListeners.add(fn as (e: KeyboardEvent) => void);
    });
    const removeEventListener = vi.fn((type: string, fn: EventListenerOrEventListenerObject) => {
      if (type === 'mousedown') mousedownListeners.delete(fn as (e: MouseEvent) => void);
      if (type === 'keydown') keydownListeners.delete(fn as (e: KeyboardEvent) => void);
    });
    vi.stubGlobal('document', { addEventListener, removeEventListener });

    const renderPicker = (props: Parameters<typeof MentionPicker>[0]) => {
      runtime.beginRender();
      MentionPicker(props);
      runtime.flushEffects();
    };

    const onClose1 = vi.fn();
    const onSelect1 = vi.fn();
    apiMocks.useUserSearch.mockReturnValue({
      data: { items: [{ id: 'u1', displayName: 'Huy Thành' }], page: 1, hasMore: false },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
      isSearchable: true,
      refetch: vi.fn(),
    });
    renderPicker({ query: 'th', onClose: onClose1, onSelect: onSelect1 });

    const onClose2 = vi.fn();
    const onSelect2 = vi.fn();
    renderPicker({ query: 'tha', onClose: onClose2, onSelect: onSelect2 });

    const onClose3 = vi.fn();
    const onSelect3 = vi.fn();
    apiMocks.useUserSearch.mockReturnValue({
      data: { items: [{ id: 'u9', displayName: 'Minh An' }], page: 1, hasMore: false },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
      isSearchable: true,
      refetch: vi.fn(),
    });
    renderPicker({ query: 'an', onClose: onClose3, onSelect: onSelect3 });

    // Chỉ gắn đúng 1 lần cho mousedown và 1 lần cho keydown dù đã re-render 3 lần với props mới
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenNthCalledWith(1, 'mousedown', expect.any(Function));
    expect(addEventListener).toHaveBeenNthCalledWith(2, 'keydown', expect.any(Function), true);
    expect(removeEventListener).not.toHaveBeenCalled();

    // Bấm Enter -> gọi onSelect3 mới nhất kèm user mới nhất
    const keyHandler = [...keydownListeners][0]!;
    keyHandler({
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(onSelect1).not.toHaveBeenCalled();
    expect(onSelect2).not.toHaveBeenCalled();
    expect(onSelect3).toHaveBeenCalledTimes(1);
    expect(onSelect3).toHaveBeenCalledWith({ id: 'u9', displayName: 'Minh An' });

    // Bấm ra ngoài -> gọi onClose3 mới nhất
    const mouseHandler = [...mousedownListeners][0]!;
    mouseHandler({ target: {} as Node } as unknown as MouseEvent);
    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).not.toHaveBeenCalled();
    expect(onClose3).toHaveBeenCalledTimes(1);

    // Unmount -> gỡ sạch cả 2 listener
    runtime.unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(2);
    expect(mousedownListeners.size).toBe(0);
    expect(keydownListeners.size).toBe(0);
  });
});
