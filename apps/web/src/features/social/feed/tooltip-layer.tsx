'use client';

import { useEffect, useState } from 'react';
import styles from './tooltip-layer.module.css';

const SHOW_DELAY_MS = 350;
const GAP = 8;
const EDGE = 8;

type Tip = { text: string; left: number; top: number; side: 'top' | 'bottom' };

/** Vị trí chú thích: giữa phía trên phần tử, không đủ chỗ thì xuống dưới; không tràn mép trái, phải. */
export function placeTooltip(
  target: { left: number; top: number; width: number; bottom: number },
  tip: { width: number; height: number },
  viewport: { width: number },
): { left: number; top: number; side: 'top' | 'bottom' } {
  const side = target.top - tip.height - GAP >= EDGE ? 'top' : 'bottom';
  const centered = target.left + target.width / 2 - tip.width / 2;
  const left = Math.min(Math.max(EDGE, centered), viewport.width - tip.width - EDGE);
  const top = side === 'top' ? target.top - tip.height - GAP : target.bottom + GAP;
  return { left, top, side };
}

/**
 * Chú thích dùng chung cho tab Cảm hứng thay `title` của trình duyệt (khung vàng hệ điều hành, hiện chậm, không chỉnh
 * được). Phần tử nào có `data-tooltip` thì rê chuột hoặc focus bằng bàn phím sẽ hiện chú thích. Vẽ với
 * `position: fixed` ở gốc trang nên không bị khung `overflow: hidden` của panel cắt. Chữ vẫn có trong nhãn của phần tử.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let current: HTMLElement | null = null;

    const hide = () => {
      window.clearTimeout(timer);
      current = null;
      setTip(null);
    };

    const show = (element: HTMLElement, delay: number) => {
      const text = element.dataset.tooltip;
      if (!text || element === current) return;
      window.clearTimeout(timer);
      current = element;
      timer = window.setTimeout(() => {
        if (current !== element || !element.isConnected) return;
        // Đo cỡ chữ bằng một phần tử ẩn cùng class để đặt đúng chỗ ngay lần vẽ đầu.
        const probe = document.createElement('div');
        probe.className = styles.tip ?? '';
        probe.style.visibility = 'hidden';
        probe.textContent = text;
        document.body.appendChild(probe);
        const size = { width: probe.offsetWidth, height: probe.offsetHeight };
        probe.remove();
        const place = placeTooltip(element.getBoundingClientRect(), size, { width: window.innerWidth });
        setTip({ text, ...place });
      }, delay);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const element = (event.target as Element).closest<HTMLElement>('[data-tooltip]');
      if (element) show(element, SHOW_DELAY_MS);
      else if (current) hide();
    };
    const onFocusIn = (event: FocusEvent) => {
      const element = (event.target as Element).closest<HTMLElement>('[data-tooltip]');
      if (element?.matches(':focus-visible')) show(element, 0);
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div className={styles.tip} data-side={tip.side} style={{ left: tip.left, top: tip.top }} aria-hidden="true">
      {tip.text}
    </div>
  );
}
