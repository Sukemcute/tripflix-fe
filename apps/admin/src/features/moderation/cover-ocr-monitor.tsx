'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { CoverOcrFilter, CoverOcrItem } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { ModerationParts } from './moderation-parts';
import styles from './cover-ocr-monitor.module.css';

const filters: { value: CoverOcrFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'flagged', label: 'Cần xem xét' },
  { value: 'failed', label: 'Quét thất bại' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'passed', label: 'Đã quét' },
];
const statusText = vi.moderation.parts.statuses;
const errorText = vi.moderation.parts.errors;

export function CoverOcrMonitor() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<CoverOcrFilter>('all');
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'cover-ocr', user?.id, filter],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.coverOcr(filter, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ? Number(page.nextCursor) : undefined,
    refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => moderationApi.retryPart(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['moderation', 'cover-ocr'] });
      void client.invalidateQueries({ queryKey: ['moderation', 'parts'] });
    },
  });
  const counts = query.data?.pages[0]?.counts;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className={styles.panel} aria-label="Theo dõi OCR ảnh bìa video">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Kiểm duyệt video</p>
          <h2>Chữ trên ảnh bìa</h2>
          <p>Theo dõi chữ đọc từ ảnh bìa video. Kết quả bị gắn cờ cần người kiểm duyệt xem lại ảnh gốc.</p>
        </div>
        <button type="button" className={styles.button} onClick={() => void query.refetch()}>
          Làm mới
        </button>
      </header>
      <div className={styles.filters} aria-label="Lọc trạng thái OCR">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={`${styles.filter} ${filter === value ? styles.selected : ''}`}
            onClick={() => { setFilter(value); setOpenPostId(null); }}
          >
            {label}<strong>{counts?.[value === 'in_progress' ? 'inProgress' : value] ?? '—'}</strong>
          </button>
        ))}
      </div>
      <AdminApiError error={query.error ?? retry.error} retry={() => void query.refetch()} />
      {retry.isSuccess && <output className={styles.notice}>Đã lên lịch quét lại ảnh bìa.</output>}
      {query.isPending && <output className={styles.empty}>Đang tải kết quả OCR…</output>}
      {!query.isPending && !query.error && items.length === 0 && (
        <p className={styles.empty}>Chưa có lượt OCR ảnh bìa ở trạng thái này.</p>
      )}
      <div className={styles.list}>
        {items.map((item: CoverOcrItem) => (
          <article key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              <div className={styles.itemHeading}>
                <h3>{item.postTitle}</h3>
                <span className={`${styles.status} ${styles[item.status] ?? ''}`}>
                  {statusText[item.status as keyof typeof statusText] ?? item.status}
                </span>
              </div>
              <p className={styles.meta}>
                Bài viết <code>{item.postId}</code> · Tác giả <code>{item.authorId}</code>
              </p>
              <p className={styles.meta}>
                Ảnh bìa <code>{item.assetId}</code> · {item.attempts} lần thử · {new Date(item.updatedAt).toLocaleString('vi-VN')}
              </p>
              {(item.status === 'passed' || item.status === 'flagged') && (
                <p className={styles.excerpt}>{item.extractedText?.trim() || vi.moderation.parts.noCoverText}</p>
              )}
              {item.errorCode && (
                <p className={styles.error}>
                  {errorText[item.errorCode as keyof typeof errorText] ?? item.errorCode}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                aria-expanded={openPostId === item.postId}
                onClick={() => setOpenPostId(openPostId === item.postId ? null : item.postId)}
              >
                {openPostId === item.postId ? 'Đóng chi tiết' : 'Xem chi tiết'}
              </button>
              {item.status === 'failed' && (
                <button
                  type="button"
                  className={styles.retry}
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(item.id)}
                >
                  {retry.isPending && retry.variables === item.id ? 'Đang lên lịch…' : 'Thử quét lại'}
                </button>
              )}
            </div>
            {openPostId === item.postId && <div className={styles.detail}><ModerationParts postId={item.postId} /></div>}
          </article>
        ))}
      </div>
      {query.hasNextPage && (
        <button
          type="button"
          className={styles.more}
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
        </button>
      )}
    </section>
  );
}
