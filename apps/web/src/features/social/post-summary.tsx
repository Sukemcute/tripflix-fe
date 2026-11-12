'use client';

import { usePostSummary, useSummaryExperience } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './post-summary.module.css';

const copy = vi.summary;

export function CommunitySummary({ postId }: { postId: string }) {
  const flow = useSummaryExperience(postId);
  const { query, isOpen } = flow;
  const summary = query.data;
  const isResult = isOpen && summary?.status === 'ready' && !flow.isLoading;
  const emptyStatus = summary && summary.status !== 'ready' ? summary.status : null;
  return (
    <section className={styles.root} aria-label={copy.title}>
      <div className={styles.header}>
        <Image
          src={isResult ? '/brand/tripi-welcome.png' : '/brand/tripi-curious.png'}
          width={52}
          height={52}
          alt={vi.mobile.common.mascot}
        />
        <div className={styles.heading}>
          <h2>
            <span>{isResult ? copy.resultTitle : copy.title}</span>
            <span className={styles.ai}>{copy.badge}</span>
          </h2>
          <p>{isResult ? t('summary.basedOn', { count: summary.commentCount }) : copy.intro}</p>
        </div>
        {isOpen && !flow.isLoading && (
          <button type="button" className={styles.iconButton} aria-label={copy.dismiss} onClick={flow.close}>
            ×
          </button>
        )}
      </div>
      {!isOpen ? (
        <button type="button" className={styles.primary} disabled={!flow.isReady} onClick={flow.open}>
          {summary ? copy.cached : copy.open}
          <span aria-hidden="true"> ↗</span>
        </button>
      ) : flow.isLoading ? (
        <div className={styles.body}>
          <output className={styles.loading}>
            <strong>{query.fetchStatus === 'paused' ? copy.offline : copy.loading}</strong>
            <span>{copy.loadingHint}</span>
            <span className={styles.skeleton} aria-hidden="true" />
            <span className={styles.skeleton} aria-hidden="true" />
          </output>
          <button type="button" className={styles.textAction} onClick={flow.cancel}>
            {copy.cancel}
          </button>
        </div>
      ) : (
        <div className={styles.body}>
          {summary?.hasSafetyWarnings && (
            <div role="note" className={styles.safety}>
              <h3>{copy.safetyTitle}</h3>
              <p>{copy.safety}</p>
            </div>
          )}
          {summary?.status === 'ready' ? (
            <p>{summary.summary}</p>
          ) : (
            !query.error && (
              <div className={styles.empty}>
                <h3>{emptyStatus ? copy[`${emptyStatus}Title`] : copy.pendingTitle}</h3>
                <p>{emptyStatus ? copy[emptyStatus] : copy.pending}</p>
                {summary?.status === 'insufficient_data' && !!summary.needed && (
                  <p>{t('summary.needed', { count: summary.needed })}</p>
                )}
              </div>
            )
          )}
          {query.error && (
            <p role="alert" className={styles.error}>
              {summary ? copy.refreshError : copy.error}
            </p>
          )}
          {(summary?.status !== 'ready' || !!query.error) && (
            <div className={styles.footer}>
              <button type="button" className={styles.textAction} onClick={flow.refresh}>
                {query.error ? copy.retry : copy.refresh}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Tóm tắt bình luận ở đầu panel bình luận Reels, cùng hành vi với mobile (TF44): tự tải, chỉ hiện khi đã có
 * bản tóm tắt; đang tải, chưa đủ bình luận hay lỗi thì không hiện gì. Panel web hẹp nên nội dung gọn 4 dòng,
 * bấm "Xem thêm" để đọc hết.
 */
export function ReelCommentSummary({ postId }: { postId: string }) {
  const { data: summary } = usePostSummary(postId, { autoLoad: true });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const text = summary?.status === 'ready' ? summary.summary : null;

  // Chỉ hiện "Xem thêm" khi nội dung thật sự dài hơn 4 dòng (đo lại khi panel đổi bề ngang).
  useEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) return;
    const observer = new ResizeObserver(() => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, isExpanded]);

  if (!summary || !text) return null;
  return (
    <section className={`${styles.root} ${styles.reelCompact}`} aria-label={copy.resultTitle}>
      <div className={styles.header}>
        <Image src="/brand/tripi-welcome.png" width={32} height={32} alt={vi.mobile.common.mascot} />
        <div className={styles.heading}>
          <h2>
            <span>{copy.resultTitle}</span>
            <span className={styles.ai}>{copy.badge}</span>
          </h2>
          <p>{t('summary.basedOn', { count: summary.commentCount })}</p>
        </div>
      </div>
      {summary.hasSafetyWarnings && (
        <div role="note" className={styles.safety}>
          <h3>{copy.safetyTitle}</h3>
          <p>{copy.safety}</p>
        </div>
      )}
      <p ref={textRef} className={`${styles.reelText} ${isExpanded ? '' : styles.reelTextClamped}`}>
        {text}
      </p>
      {(isOverflowing || isExpanded) && (
        <button
          type="button"
          className={styles.textAction}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? vi.api.postShowLess : vi.api.postReadMore}
        </button>
      )}
    </section>
  );
}
