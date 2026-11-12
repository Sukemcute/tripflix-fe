'use client';

import { useSummaryExperience } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
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
