'use client';

import { t, vi } from '@tripflix/i18n';
import { AdminButton } from './button';

/** Phân trang theo số trang: "21–40 / 134" + Trang trước/sau. */
export function Pagination({
  page,
  pageSize,
  total,
  isFetching = false,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label={vi.adminOperations.page}
      className="flex items-center justify-between gap-3 px-1 pt-3 text-xs text-text-muted"
    >
      <span className="tabular-nums">{t('adminOperations.table.range', { from, to, total })}</span>
      <div className="flex items-center gap-2">
        <AdminButton size="sm" disabled={page <= 1 || isFetching} onClick={() => onPageChange(page - 1)}>
          {vi.adminOperations.previous}
        </AdminButton>
        <span className="tabular-nums">
          {page} / {pageCount}
        </span>
        <AdminButton size="sm" disabled={page >= pageCount || isFetching} onClick={() => onPageChange(page + 1)}>
          {vi.adminOperations.next}
        </AdminButton>
      </div>
    </nav>
  );
}

/** Danh sách tải theo con trỏ: "Hiển thị 40 / 134" + Tải thêm (khi còn). `total` không biết thì chỉ hiện số đã tải. */
export function LoadMore({
  shown,
  total,
  hasMore,
  isFetching,
  onLoadMore,
}: {
  shown: number;
  total?: number;
  hasMore: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-xs text-text-muted">
      <span className="tabular-nums">
        {total === undefined
          ? t('adminOperations.table.shownLoaded', { shown })
          : t('adminOperations.table.shown', { shown, total })}
      </span>
      {hasMore && (
        <AdminButton size="sm" disabled={isFetching} onClick={onLoadMore}>
          {isFetching ? vi.api.loading : vi.adminOperations.table.loadMore}
        </AdminButton>
      )}
    </div>
  );
}
