'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { vi } from '@tripflix/i18n';
import { publishNoticeStore } from './published-post';
import styles from './publish-toast.module.css';

const HIDE_AFTER_MS = 6000;

/** Báo "đã đăng" ở cuối màn hình sau khi pop-up đăng bài đóng; bài viết có nút cuộn tới bài vừa đăng. */
export function PublishToast() {
  const notice = useSyncExternalStore(publishNoticeStore.subscribe, publishNoticeStore.get, () => null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => publishNoticeStore.hide(), HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  const isReel = notice.postType === 'video';

  return (
    <output key={notice.id} className={styles.toast} aria-live="polite">
      <svg className={styles.icon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        {notice.status === 'held' ? <g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g> : <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <span className={styles.text}>{notice.status === 'held' ? vi.moderation.heldPost : isReel ? vi.api.composerPublishedReel : vi.api.composerPublishedPost}</span>
      {!isReel && notice.status !== 'held' && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            document
              .querySelector(`[data-post-id="${CSS.escape(notice.postId)}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            publishNoticeStore.hide();
          }}
        >
          {vi.api.composerPublishedView}
        </button>
      )}
      <button type="button" className={styles.close} aria-label={vi.api.cancel} onClick={() => publishNoticeStore.hide()}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </output>
  );
}
