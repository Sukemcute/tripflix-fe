'use client';
import { useEffect } from 'react';

const RIPPLE_SELECTOR = '.primary-button, .secondary-button, .ripple-button';

// Ghi vị trí con trỏ lúc đi vào button để màu loang lan ra từ đúng chỗ đó (CSS ở globals.css).
export function ButtonRipple() {
  useEffect(() => {
    const setOrigin = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(RIPPLE_SELECTOR);
      if (!button || button.contains(event.relatedTarget as Node | null)) return;
      const rect = button.getBoundingClientRect();
      button.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
      button.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
    };
    document.addEventListener('pointerover', setOrigin);
    return () => document.removeEventListener('pointerover', setOrigin);
  }, []);
  return null;
}
