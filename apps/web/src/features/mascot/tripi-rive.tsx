'use client';

import { RuntimeLoader, useRive } from '@rive-app/react-canvas';
import { useEffect, useRef } from 'react';
import styles from './tripi-live.module.css';

// Phục vụ đúng WASM cùng phiên bản runtime để canvas khởi tạo trong suốt và không phụ thuộc CDN.
RuntimeLoader.setWasmUrl('/brand/tripi-rive/rive.wasm');

export function TripiRive({ active, onReady }: { active: boolean; onReady: (ready: boolean) => void }) {
  const reactionCount = useRef(0);
  const player = useRef<HTMLButtonElement>(null);
  const { rive, RiveComponent } = useRive({
    src: '/brand/tripi-rive/tripi.riv',
    artboard: 'Tripi',
    stateMachines: 'Tripi',
    autoplay: true,
    autoBind: true,
    shouldDisableRiveListeners: true,
    onLoadError: () => onReady(false),
  });

  const model = rive?.viewModelInstance;

  useEffect(() => {
    if (!rive || !model) return;
    const probe = document.createElement('canvas');
    probe.width = 16;
    probe.height = 16;
    const context = probe.getContext('2d', { willReadFrequently: true });
    let timeout: number | undefined;

    const detectTripiFrame = () => {
      const canvas = player.current?.querySelector('canvas');
      if (!canvas || !context || !canvas.width || !canvas.height) {
        timeout = window.setTimeout(detectTripiFrame, 100);
        return;
      }

      context.clearRect(0, 0, 16, 16);
      context.drawImage(canvas, 0, 0, 16, 16);
      const pixels = context.getImageData(0, 0, 16, 16).data;
      let blackPixels = 0;
      let coloredPixels = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if ((pixels[offset + 3] ?? 0) < 200) continue;
        const brightest = Math.max(pixels[offset] ?? 0, pixels[offset + 1] ?? 0, pixels[offset + 2] ?? 0);
        if (brightest < 25) blackPixels += 1;
        else coloredPixels += 1;
      }

      // Free exports render an opaque black Rive splash first. Reveal only after a real Tripi frame appears.
      if (coloredPixels > 16 && blackPixels < 64) {
        onReady(true);
        return;
      }
      timeout = window.setTimeout(detectTripiFrame, 100);
    };

    detectTripiFrame();
    return () => {
      window.clearTimeout(timeout);
      onReady(false);
    };
  }, [rive, model, onReady]);

  useEffect(() => {
    if (!rive || !model) return;
    const blink = model.trigger('blink');
    const reactions = ['wave', 'wink', 'wave', 'laugh'] as const;
    let blinkTimeout: number | undefined;
    let reactionTimeout: number | undefined;
    let reactionIndex = 0;
    const scheduleBlink = () => {
      blinkTimeout = window.setTimeout(
        () => {
          blink?.trigger();
          scheduleBlink();
        },
        2600 + Math.random() * 3000,
      );
    };
    const scheduleReaction = () => {
      reactionTimeout = window.setTimeout(
        () => {
          const reaction = reactions[reactionIndex % reactions.length] ?? 'wave';
          model.trigger(reaction)?.trigger();
          reactionIndex += 1;
          scheduleReaction();
        },
        6500 + Math.random() * 4500,
      );
    };
    const sync = () => {
      window.clearTimeout(blinkTimeout);
      window.clearTimeout(reactionTimeout);
      if (active && !document.hidden) {
        rive.startRendering();
        scheduleBlink();
        scheduleReaction();
      } else {
        rive.stopRendering();
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearTimeout(blinkTimeout);
      window.clearTimeout(reactionTimeout);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [active, model, rive]);

  return (
    <button
      ref={player}
      type="button"
      aria-label="Chào Tripi"
      className={styles.player}
      disabled={!model}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') model?.trigger('wave')?.trigger();
      }}
      onClick={() => {
        const reaction = reactionCount.current++ % 2 === 0 ? 'laugh' : 'wink';
        model?.trigger(reaction)?.trigger();
        model?.trigger('wave')?.trigger();
      }}
    >
      <RiveComponent aria-hidden="true" />
    </button>
  );
}
