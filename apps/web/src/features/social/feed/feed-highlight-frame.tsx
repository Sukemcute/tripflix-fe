'use client';

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { getClippedHighlightRect, getVisiblePostRect } from './highlight-rect';
import styles from './social-feed.module.css';

export function FeedHighlightFrame({
  children,
  scrollRef,
  postId,
  isVisible,
}: {
  children: ReactNode;
  scrollRef: RefObject<HTMLElement | null>;
  postId?: string;
  isVisible: boolean;
}) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const frame = frameRef.current;
    const shadow = shadowRef.current;
    if (!container || !frame || !shadow || !isVisible) return;

    const pending = { animationFrame: 0, framedCard: null as HTMLElement | null };
    const cardSelector = postId
      ? `.${styles.postCardActiveComment}[data-post-id="${CSS.escape(postId)}"]`
      : null;
    const positionLayer = (
      layer: HTMLSpanElement,
      rect: NonNullable<ReturnType<typeof getVisiblePostRect>>,
    ) => {
      layer.style.top = `${rect.top}px`;
      layer.style.left = `${rect.left}px`;
      layer.style.width = `${rect.width}px`;
      layer.style.height = `${rect.height}px`;
      layer.hidden = false;
    };
    const clearFrame = () => {
      frame.hidden = true;
      pending.framedCard?.removeAttribute('data-highlight-framed');
      pending.framedCard = null;
    };
    const updateFrame = () => {
      pending.animationFrame = 0;
      const viewport = container.getBoundingClientRect();
      const searchBar = container.querySelector<HTMLElement>(`.${styles.searchBackBar}`);
      const coveredTop = searchBar?.getBoundingClientRect().bottom;
      const hoveredCard =
        container.querySelector<HTMLElement>(`.${styles.postCard}:hover`) ??
        container.querySelector<HTMLElement>(`.${styles.postCard}:focus-within`);
      const hoverRect = hoveredCard
        ? getVisiblePostRect(viewport, hoveredCard.getBoundingClientRect(), coveredTop)
        : null;
      if (hoverRect) {
        positionLayer(shadow, hoverRect);
        shadow.setAttribute('data-visible', '');
      } else shadow.removeAttribute('data-visible');

      const card = cardSelector ? container.querySelector<HTMLElement>(cardSelector) : null;
      if (!card) {
        clearFrame();
        return;
      }
      const rect = getClippedHighlightRect(viewport, card.getBoundingClientRect(), coveredTop);
      if (!rect) {
        clearFrame();
        return;
      }
      if (pending.framedCard !== card) clearFrame();
      pending.framedCard = card;
      card.setAttribute('data-highlight-framed', '');
      positionLayer(frame, rect);
    };
    const scheduleFrame = () => {
      if (!pending.animationFrame) pending.animationFrame = requestAnimationFrame(updateFrame);
    };
    const resizeObserver = new ResizeObserver(scheduleFrame);
    const observeContent = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(container);
      for (const child of container.children) resizeObserver.observe(child);
      scheduleFrame();
    };
    const mutationObserver = new MutationObserver(observeContent);
    mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });
    observeContent();
    cancelAnimationFrame(pending.animationFrame);
    updateFrame();
    container.addEventListener('scroll', scheduleFrame, { passive: true });
    container.addEventListener('pointerover', scheduleFrame);
    container.addEventListener('pointerout', scheduleFrame);
    container.addEventListener('focusin', scheduleFrame);
    container.addEventListener('focusout', scheduleFrame);
    window.addEventListener('resize', scheduleFrame);
    return () => {
      cancelAnimationFrame(pending.animationFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener('scroll', scheduleFrame);
      container.removeEventListener('pointerover', scheduleFrame);
      container.removeEventListener('pointerout', scheduleFrame);
      container.removeEventListener('focusin', scheduleFrame);
      container.removeEventListener('focusout', scheduleFrame);
      window.removeEventListener('resize', scheduleFrame);
      clearFrame();
      shadow.removeAttribute('data-visible');
    };
  }, [scrollRef, postId, isVisible]);

  return (
    <div className={styles.mainFeedFrame}>
      {children}
      <span ref={shadowRef} className={styles.hoveredPostShadow} aria-hidden="true" />
      <span ref={frameRef} className={styles.clippedPostHighlight} aria-hidden="true" hidden />
    </div>
  );
}
