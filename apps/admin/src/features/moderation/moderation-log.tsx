'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type {
  AdminModerationControllerActionsParams,
  ModerationLogDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime, shortId } from '../ui/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Segmented,
  Skeleton,
  controlClass,
  fieldLabelClass,
  tableClass,
  tdClass,
  thClass,
  type Tone,
} from '../ui/primitives';

const text = vi.moderation;
const actionLabels = vi.moderation as unknown as Record<string, string>;
const reasonLabels = vi.moderation.reasons as Record<string, string>;
export const LOG_ACTION_TONE: Record<string, Tone> = {
  hide: 'coral',
  auto_hide: 'sun',
  remove: 'danger',
  restore: 'teal',
  dismiss: 'neutral',
};

export function LogTable({ items }: { items: ModerationLogDto[] }) {
  if (!items.length) return <EmptyState title="Chưa có thao tác kiểm duyệt." />;
  return (
    <div className="overflow-x-auto">
      <table className={tableClass} aria-label="Nhật ký thao tác kiểm duyệt">
        <thead>
          <tr>
            <th className={thClass}>{text.time}</th>
            <th className={thClass}>{text.staff}</th>
            <th className={thClass}>{text.action}</th>
            <th className={thClass}>{text.target}</th>
            <th className={thClass}>{text.reason}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((action) => (
            <tr key={action.id} className="hover:bg-surface">
              <td className={`${tdClass} whitespace-nowrap text-text-muted`}>
                <time dateTime={action.createdAt}>{formatDateTime(action.createdAt)}</time>
              </td>
              <td className={tdClass}>
                <span className="block font-semibold">
                  {action.actorType === 'system' ? 'Hệ thống tự động' : 'Kiểm duyệt viên'}
                </span>
                {action.actorType !== 'system' && (
                  <code className="text-xs text-text-muted" title={action.moderatorId}>
                    {action.moderatorId?.slice(0, 8) || 'Chưa xác định'}
                  </code>
                )}
              </td>
              <td className={tdClass}>
                <Badge tone={LOG_ACTION_TONE[action.action] ?? 'neutral'} hasDot>
                  {actionLabels[action.action] ?? action.action}
                </Badge>
              </td>
              <td className={`${tdClass} text-xs text-text-muted`}>
                <span className="block font-semibold text-text">
                  {action.targetType === 'comment' ? text.comment : text.post}
                </span>
                <code title={action.commentId ?? action.postId ?? undefined}>
                  {shortId(action.commentId ?? action.postId)}
                </code>
              </td>
              <td className={tdClass}>
                {reasonLabels[action.reasonCode] ?? action.reasonCode}
                {action.reasonDetail && <p className="mt-0.5 text-xs text-text-muted">{action.reasonDetail}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ActorFilter = 'all' | 'staff' | 'system';

/** Xuất CSV ở client từ các bản ghi đã tải (không có API xuất riêng). */
function downloadCsv(items: ModerationLogDto[]) {
  const header = ['time', 'actor_type', 'moderator_id', 'action', 'target_type', 'post_id', 'comment_id', 'reason_code', 'reason_detail'];
  const escape = (value: string | null | undefined) => `"${(value ?? '').replaceAll('"', '""')}"`;
  const rows = items.map((item) =>
    [item.createdAt, item.actorType, item.moderatorId, item.action, item.targetType, item.postId, item.commentId, item.reasonCode, item.reasonDetail]
      .map(escape)
      .join(','),
  );
  const blob = new Blob([`﻿${[header.join(','), ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tripflix-moderation-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Nhật ký thao tác; lọc ngày gửi lên API, lọc người thực hiện và thao tác lọc trên bản ghi đã tải. */
export function ModerationLog() {
  const audit = vi.adminConsole.audit;
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [actor, setActor] = useState<ActorFilter>('all');
  const [action, setAction] = useState('');
  const filters: AdminModerationControllerActionsParams = {
    from: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : undefined,
    to: range.to ? new Date(`${range.to}T23:59:59`).toISOString() : undefined,
  };
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => moderationApi.log({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const rawItems = query.data?.pages.flatMap((page) => page.items) ?? [];
  const items = rawItems.filter(
    (item) => (actor === 'all' || (actor === 'system') === (item.actorType === 'system')) && (!action || item.action === action),
  );

  return (
    <Card aria-label="Nhật ký thao tác">
      <CardHeader
        icon="audit"
        title="Nhật ký thao tác kiểm duyệt"
        hint="Lịch sử quyết định của kiểm duyệt viên và hệ thống."
        action={
          <Button size="sm" icon="download" disabled={!items.length} onClick={() => downloadCsv(items)}>
            {audit.exportCsv}
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3 border-y border-border bg-surface px-5 py-3">
        <div className={fieldLabelClass}>
          {audit.filterActor}
          <Segmented
            ariaLabel={audit.filterActor}
            value={actor}
            onChange={setActor}
            className="bg-background"
            items={[
              { id: 'all', label: audit.actorAll },
              { id: 'staff', label: audit.actorStaff },
              { id: 'system', label: audit.actorSystem },
            ]}
          />
        </div>
        <label className={`${fieldLabelClass} w-40`}>
          {audit.filterAction}
          <select className={controlClass} value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">{text.allActions}</option>
            {Object.keys(LOG_ACTION_TONE).map((key) => (
              <option key={key} value={key}>
                {actionLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label className={`${fieldLabelClass} w-40`}>
          {audit.from}
          <input
            type="date"
            className={controlClass}
            value={range.from}
            max={range.to || undefined}
            onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
          />
        </label>
        <label className={`${fieldLabelClass} w-40`}>
          {audit.to}
          <input
            type="date"
            className={controlClass}
            value={range.to}
            min={range.from || undefined}
            onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
          />
        </label>
        <span className="ml-auto text-xs text-text-muted">{t('adminConsole.audit.loaded', { count: rawItems.length })}</span>
      </div>
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <div className="flex flex-col gap-2 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        !query.error && <LogTable items={items} />
      )}
      {query.hasNextPage && (
        <footer className="flex justify-center border-t border-border px-5 py-3">
          <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
          </Button>
        </footer>
      )}
    </Card>
  );
}
