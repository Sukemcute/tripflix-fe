'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { getNextHeaderVisibility, MOBILE_HEADER_QUERY } from './header-visibility';

const HIDDEN_ATTRIBUTE = 'data-header-hidden';

/**
 * Trên điện thoại: cuộn xuống thì ẩn header, cuộn lên thì hiện (CSS ở mobile-header.css). Không render gì;
 * chỉ gắn attribute lên .ota-header trong effect nên server và client render giống nhau, không lệch hydration.
 * Trang khoá cuộn body (Cảm hứng) không phát sự kiện cuộn của window nên header luôn hiện ở đó.
 */
export function HeaderAutoHide() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.ota-header');
    if (!header) return;
    const media = window.matchMedia(MOBILE_HEADER_QUERY);
    let state = { isHidden: false, anchorY: window.scrollY };
    let frame = 0;

    const apply = (isHidden: boolean) => {
      state = { ...state, isHidden };
      header.toggleAttribute(HIDDEN_ATTRIBUTE, isHidden);
    };
    const isPinned = () =>
      header.contains(document.activeElement) || header.querySelector('[aria-expanded="true"]') !== null;

    const update = () => {
      frame = 0;
      if (!media.matches) {
        if (state.isHidden) apply(false);
        return;
      }
      state = getNextHeaderVisibility({
        anchorY: state.anchorY,
        currentY: window.scrollY,
        isHidden: state.isHidden,
        headerHeight: header.offsetHeight,
        isPinned: isPinned(),
      });
      header.toggleAttribute(HIDDEN_ATTRIBUTE, state.isHidden);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const show = () => apply(false);

    apply(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    header.addEventListener('focusin', show);
    media.addEventListener('change', show);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      header.removeEventListener('focusin', show);
      media.removeEventListener('change', show);
      header.removeAttribute(HIDDEN_ATTRIBUTE);
    };
    // Đổi trang thì bắt đầu lại từ trạng thái hiện.
  }, [pathname]);

  return null;
}
