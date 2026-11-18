'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { GENIE_CLOSE_MS, GENIE_OPEN_MS, smoothGenieProgress } from './genie-motion';
import { createGenieRenderer, type GenieRenderer } from './genie-renderer';
import { snapshotChatPanel } from './snapshot-chat-panel';

/** Chỉ thay khung thật bằng texture trong lúc kéo vải; mở xong trả lại toàn bộ tương tác DOM. */
export function useGenieMotion(
  panelRef: RefObject<HTMLElement | null>,
  isClosing: boolean,
  onClosed: () => void,
) {
  const motion = useRef({ progress: 0 });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const state = motion.current;
    if (!panel) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.progress = isClosing ? 0 : 1;
      if (isClosing) {
        const timer = window.setTimeout(onClosed, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const run = {
      cancelled: false,
      frame: 0,
      renderer: null as GenieRenderer | null,
      fallback: null as Animation | null,
    };
    const visibility = panel.style.visibility;
    const texture = snapshotChatPanel(panel);
    if (!isClosing) panel.style.visibility = 'hidden';
    const start = async () => {
      try {
        const image = await texture;
        if (run.cancelled) return;
        const rect = panel.getBoundingClientRect();
        const originX =
          Number.parseFloat(panel.style.getPropertyValue('--panel-origin-x')) || rect.width * 0.7;
        const originY = Number.parseFloat(panel.style.getPropertyValue('--panel-origin-y')) || -32;
        const renderer = createGenieRenderer(image, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          anchorX: rect.left + originX,
          anchorY: rect.top + originY,
        });
        run.renderer = renderer;
        const from = state.progress;
        const to = isClosing ? 0 : 1;
        const duration = Math.max(160, (isClosing ? GENIE_CLOSE_MS : GENIE_OPEN_MS) * Math.abs(to - from));
        const started = performance.now();
        renderer.draw(from);
        panel.style.visibility = 'hidden';
        const tick = (now: number) => {
          if (run.cancelled) return;
          const time = Math.min(1, (now - started) / duration);
          state.progress = from + (to - from) * smoothGenieProgress(time);
          renderer.draw(state.progress);
          if (time < 1) run.frame = requestAnimationFrame(tick);
          else {
            renderer.dispose();
            run.renderer = null;
            if (isClosing) onClosed();
            else panel.style.visibility = visibility;
          }
        };
        run.frame = requestAnimationFrame(tick);
      } catch {
        if (run.cancelled) return;
        panel.style.visibility = visibility;
        // Thiết bị không hỗ trợ WebGL vẫn mở/đóng bình thường, không dùng lại mặt nạ cắt chữ.
        const frames = [
          { opacity: 0, transform: 'scale(0.97)' },
          { opacity: 1, transform: 'none' },
        ];
        const animation = panel.animate(isClosing ? frames.reverse() : frames, {
          duration: 180,
          fill: 'both',
        });
        run.fallback = animation;
        animation.onfinish = () => {
          state.progress = isClosing ? 0 : 1;
          if (isClosing) onClosed();
          else animation.cancel();
        };
      }
    };
    void start();
    return () => {
      run.cancelled = true;
      cancelAnimationFrame(run.frame);
      run.renderer?.dispose();
      if (run.fallback) run.fallback.onfinish = null;
      run.fallback?.cancel();
      panel.style.visibility = visibility;
    };
  }, [panelRef, isClosing, onClosed]);
}
