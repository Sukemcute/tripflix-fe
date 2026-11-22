'use client';

import { vi } from '@tripflix/i18n';
import styles from './comment-skeleton.module.css';

// Bề rộng tự nhiên cho các hàng skeleton
export const ROW_WIDTH_PRESETS = [
  { meta: '38%', body: '88%' },
  { meta: '44%', body: '76%' },
  { meta: '35%', body: '92%' },
  { meta: '48%', body: '68%' },
  { meta: '40%', body: '84%' },
  { meta: '42%', body: '79%' },
  { meta: '36%', body: '90%' },
  { meta: '46%', body: '72%' },
];

export function getRowWidthPreset(index: number): { meta: string; body: string } {
  return ROW_WIDTH_PRESETS[index % ROW_WIDTH_PRESETS.length] ?? { meta: '40%', body: '80%' };
}

export interface CommentSkeletonListProps {
  /** Số hàng placeholder dàn đều kín chiều cao khung bình luận. */
  count?: number;
  className?: string;
}

/**
 * Khung tải bình luận: chỉ là các hàng shimmer, không chứa nội dung nào.
 * Bình luận thật do component cha hiển thị khi API trả về; không bao giờ hiện bình luận mẫu thay cho dữ liệu thật.
 */
export function CommentSkeletonList({ count = 8, className = '' }: CommentSkeletonListProps) {
  const rows = Array.from({ length: Math.max(1, count) });
  return (
    <output className={`${styles.fullFrameContainer} ${className}`} aria-busy="true" aria-label={vi.api.commentsLoading}>
      <div className={styles.skeletonRowsWrapper} aria-hidden="true">
        {rows.map((_, index) => {
          const preset = getRowWidthPreset(index);
          return (
            <div key={index} className={styles.skeletonRow}>
              <div className={`${styles.avatarPlaceholder} ${styles.shimmerSweep}`} />
              <div className={styles.textBars}>
                <div className={`${styles.textBarMeta} ${styles.shimmerSweep}`} style={{ width: preset.meta }} />
                <div className={`${styles.textBarBody} ${styles.shimmerSweep}`} style={{ width: preset.body }} />
              </div>
            </div>
          );
        })}
      </div>
    </output>
  );
}
