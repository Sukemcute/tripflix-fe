'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { CoverOcrFilter, CoverOcrItem } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminButton } from '../../ui/button';
import { DataTable, type DataColumn } from '../../ui/data-table';
import { DetailDrawer } from '../../ui/detail-drawer';
import { DetailSection, KeyValueList } from '../../ui/detail-parts';
import { buildDrawerNavigation } from '../../ui/use-detail-param';
import { LoadMore } from '../../ui/pagination';
import { Segmented } from '../../ui/segmented';
import { EmptyState } from '../../ui/states';
import { StatusBadge, type StatusTone } from '../../ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { ModerationParts } from './moderation-parts';

const filters: { value: CoverOcrFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'flagged', label: 'Cần xem xét' },
  { value: 'failed', label: 'Quét thất bại' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'passed', label: 'Đã quét' },
];
const statusText = vi.moderation.parts.statuses;
const errorText = vi.moderation.parts.errors;

const statusTone = (status: string): StatusTone =>
  status === 'passed' ? 'success' : status === 'flagged' ? 'warning' : status === 'failed' ? 'danger' : 'neutral';
const statusLabel = (status: string) => statusText[status as keyof typeof statusText] ?? status;
const formatAt = (value: string) => new Date(value).toLocaleString('vi-VN');

/** Theo dõi chữ đọc được từ ảnh bìa video; chi tiết bài mở trong drawer bên phải, danh sách giữ nguyên. */
export function CoverOcrMonitor() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<CoverOcrFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'cover-ocr', user?.id, filter],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.coverOcr(filter, pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
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
  const opened = items.find((item) => item.id === openId);

  const columns: DataColumn<CoverOcrItem>[] = [
    {
      id: 'post',
      header: 'Bài viết',
      openLabel: (item) => item.postTitle,
      cell: (item) => (
        <span className="block max-w-xl min-w-0">
          <span className="block truncate">{item.postTitle}</span>
          {(item.status === 'passed' || item.status === 'flagged') && (
            <span className="block truncate text-xs text-text-muted">
              {item.extractedText?.trim() || vi.moderation.parts.noCoverText}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (item) => <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>,
    },
    { id: 'attempts', header: 'Lần thử', align: 'right', hideBelow: 'sm', cell: (item) => item.attempts },
    { id: 'updatedAt', header: 'Cập nhật', hideBelow: 'md', cell: (item) => formatAt(item.updatedAt) },
    {
      id: 'actions',
      header: <span className="sr-only">Thao tác</span>,
      align: 'right',
      cell: (item) =>
        item.status === 'failed' ? (
          <AdminButton size="sm" disabled={retry.isPending} onClick={() => retry.mutate(item.id)}>
            {retry.isPending && retry.variables === item.id ? 'Đang lên lịch…' : 'Thử quét lại'}
          </AdminButton>
        ) : null,
    },
  ];

  return (
    <section className="space-y-3" aria-label="Theo dõi OCR ảnh bìa video">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Chữ trên ảnh bìa</h2>
          <p className="text-[13px] text-text-muted">
            Theo dõi chữ đọc từ ảnh bìa video. Kết quả bị gắn cờ cần người kiểm duyệt xem lại ảnh gốc.
          </p>
        </div>
        <AdminButton onClick={() => void query.refetch()}>Làm mới</AdminButton>
      </div>
      <Segmented
        label="Lọc trạng thái OCR"
        value={filter}
        options={filters.map(({ value, label }) => ({
          id: value,
          label,
          count: counts?.[value === 'in_progress' ? 'inProgress' : value],
        }))}
        onChange={(value) => {
          setFilter(value);
          setOpenId(null);
        }}
      />
      <AdminApiError error={query.error ?? retry.error} retry={() => void query.refetch()} />
      {retry.isSuccess && (
        <output className="block text-[13px] text-teal-ink">Đã lên lịch quét lại ảnh bìa.</output>
      )}
      <DataTable
        label="Kết quả OCR ảnh bìa"
        columns={columns}
        rows={items}
        getRowId={(item) => item.id}
        onRowOpen={(item) => setOpenId(item.id)}
        selectedId={openId}
        isLoading={query.isPending}
        empty={
          !query.error && <EmptyState title="Chưa có lượt OCR ảnh bìa ở trạng thái này" />
        }
      />
      {items.length > 0 && (
        <LoadMore
          shown={items.length}
          hasMore={!!query.hasNextPage}
          isFetching={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
      {opened && (
        <DetailDrawer
          title={opened.postTitle}
          status={<StatusBadge tone={statusTone(opened.status)}>{statusLabel(opened.status)}</StatusBadge>}
          subtitle={opened.postId}
          scrollKey={opened.id}
          navigation={buildDrawerNavigation(
            items.map((item) => item.id),
            opened.id,
            setOpenId,
          )}
          footer={
            opened.status === 'failed' ? (
              <AdminButton
                variant="primary"
                disabled={retry.isPending}
                onClick={() => retry.mutate(opened.id)}
              >
                {retry.isPending && retry.variables === opened.id ? 'Đang lên lịch…' : 'Thử quét lại'}
              </AdminButton>
            ) : undefined
          }
          onClose={() => setOpenId(null)}
        >
          <DetailSection title="Lượt quét">
            <KeyValueList
              items={[
                { label: 'Bài viết', value: opened.postId, isCode: true },
                { label: 'Tác giả', value: opened.authorId, isCode: true },
                { label: 'Ảnh bìa', value: opened.assetId, isCode: true },
                { label: 'Lần thử', value: opened.attempts },
                { label: 'Cập nhật', value: formatAt(opened.updatedAt) },
              ]}
            />
            {(opened.status === 'passed' || opened.status === 'flagged') && (
              <p className="mt-3 text-sm leading-6 break-words whitespace-pre-wrap">
                {opened.extractedText?.trim() || vi.moderation.parts.noCoverText}
              </p>
            )}
            {opened.errorCode && (
              <p className="mt-3 text-[13px] text-coral-ink">
                {errorText[opened.errorCode as keyof typeof errorText] ?? opened.errorCode}
              </p>
            )}
          </DetailSection>
          <ModerationParts postId={opened.postId} />
        </DetailDrawer>
      )}
    </section>
  );
}
