'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  userActivityControllerDetail,
  userActivityControllerList,
} from '@tripflix/api-client/core-api/analytics/analytics';
import type { UserActivityListItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { Pagination } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { readEnumParam, readPageParam } from '@/ui/url-params';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { UserActivityDialog } from './user-activity-dialog';
import { UserActivityChart } from './user-activity-overview';
import { UserAiUsage } from './user-ai-usage';
import { LoadingState, Metric } from '../shell/operations-ui';
import {
  chatQuestion,
  describeEvent,
  kindLabel,
  USER_ACTIVITY_RANGES,
  userActivityRange,
  type UserActivityRangeDays,
} from './user-activity-format';

const copy = vi.userActivity;
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;
const count = new Intl.NumberFormat('vi-VN');
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});
const formatDateTime = (value: string | null) => (value ? dateTime.format(new Date(value)) : '—');

/** Hành vi từng người dùng (SCRUM-177). Chỉ superadmin; API tự chặn người khác. */
const RANGE_PARAMS = USER_ACTIVITY_RANGES.map(String);
const DEFAULT_RANGE = '7';

export function UserActivityWorkspace() {
  const { params, update } = useUrlParams();
  const days = Number(readEnumParam(params.get('days'), RANGE_PARAMS, DEFAULT_RANGE)) as UserActivityRangeDays;
  const page = readPageParam(params.get('page'));
  const [selected, setSelected] = useState<UserActivityListItemDto | null>(null);
  const [openedAt] = useState(() => Date.now()); // mở trang qua nửa đêm thì tải lại để có ngày mới
  const range = userActivityRange(days, openedAt);
  const queryParams = { ...range, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: ['admin', 'user-activity', queryParams],
    queryFn: async ({ signal }) => (await userActivityControllerList(queryParams, { signal })).data,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = list.isError ? undefined : list.data;

  const columns: DataColumn<UserActivityListItemDto>[] = [
    {
      id: 'user',
      header: copy.columns.user,
      cell: (item) => <span>{item.displayName ?? copy.deletedAccount}</span>,
    },
    { id: 'email', header: copy.columns.email, hideBelow: 'md', cell: (item) => item.email ?? '—' },
    {
      id: 'followers',
      header: copy.columns.followers,
      align: 'right',
      hideBelow: 'lg',
      cell: (item) => count.format(item.profile.followerCount),
    },
    {
      id: 'following',
      header: copy.columns.following,
      align: 'right',
      hideBelow: 'xl',
      cell: (item) => count.format(item.profile.followingCount),
    },
    {
      id: 'likes',
      header: copy.columns.likes,
      align: 'right',
      hideBelow: 'xl',
      cell: (item) => count.format(item.profile.likeCount),
    },
    {
      id: 'posts',
      header: copy.columns.posts,
      align: 'right',
      hideBelow: 'sm',
      cell: (item) => count.format(item.profile.postCount),
    },
    {
      id: 'lastActiveAt',
      header: copy.columns.lastActiveAt,
      hideBelow: 'md',
      cell: (item) => <span className="whitespace-nowrap">{formatDateTime(item.lastActiveAt)}</span>,
    },
    {
      id: 'open',
      header: <span className="sr-only">{copy.viewDetail}</span>,
      align: 'right',
      cell: (item) => (
        <AdminButton size="sm" onClick={() => setSelected(item)}>
          {copy.viewDetail}
        </AdminButton>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <FilterToolbar summary={copy.autoRefresh}>
        <SelectField
          label={copy.range}
          value={String(days)}
          options={USER_ACTIVITY_RANGES.map((value) => ({ value: String(value), label: copy.ranges[value] }))}
          onChange={(value) => {
            update({ days: value === DEFAULT_RANGE ? null : value, page: null });
            setSelected(null);
          }}
        />
      </FilterToolbar>

      <UserActivityChart range={range} days={days} />

      {list.isError && <AdminApiError error={list.error} retry={() => void list.refetch()} />}

      <section className="space-y-3" aria-labelledby="user-activity-list-title">
        <div>
          <h2 id="user-activity-list-title" className="text-sm font-semibold">
            {copy.listTitle}
          </h2>
          <p className="text-[13px] text-text-muted">{copy.listDescription}</p>
        </div>
        <DataTable
          label={copy.listTitle}
          columns={columns}
          rows={data?.items ?? []}
          getRowId={(item) => item.userId}
          onRowOpen={setSelected}
          selectedId={selected?.userId}
          isLoading={list.isPending}
          empty={!list.isError && <EmptyState title={copy.empty} />}
        />
        {data ? (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            isFetching={list.isFetching}
            onPageChange={(next) => {
              update({ page: next === 1 ? null : String(next) });
              setSelected(null);
            }}
          />
        ) : null}
      </section>

      {selected && <UserActivityDetail user={selected} range={range} onClose={() => setSelected(null)} />}
    </div>
  );
}

function UserActivityDetail({
  user,
  range,
  onClose,
}: {
  user: UserActivityListItemDto;
  range: { from: string; to: string };
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['admin', 'user-activity', user.userId, range],
    queryFn: async ({ signal }) => (await userActivityControllerDetail(user.userId, range, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const data = detail.isError ? undefined : detail.data;
  const name = data?.displayName ?? user.displayName ?? copy.deletedAccount;
  const questions = (data?.recentEvents ?? []).flatMap((event) => {
    const question = chatQuestion(event);
    return question ? [{ id: event.id, question, occurredAt: event.occurredAt }] : [];
  });

  return (
    <UserActivityDialog
      title={t('userActivity.detailTitle', { name })}
      description={
        data ? `${data.email} · ${copy.registeredAt}: ${formatDateTime(data.createdAt)}` : undefined
      }
      onClose={onClose}
    >
      {detail.isError && <AdminApiError error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending ? (
        <LoadingState />
      ) : data ? (
        <div className="space-y-6 p-5">
          <section aria-label={copy.profile.title}>
            <h3 className="mb-1 text-sm font-bold text-navy">{copy.profile.title}</h3>
            <p className="mb-3 text-xs text-text-muted">{copy.profile.hint}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label={copy.profile.followers} value={data.profile.followerCount} />
              <Metric label={copy.profile.following} value={data.profile.followingCount} />
              <Metric label={copy.profile.likes} value={data.profile.likeCount} />
              <Metric label={copy.profile.posts} value={data.profile.postCount} />
            </div>
          </section>

          <section aria-label={copy.activityInRange}>
            <h3 className="mb-3 text-sm font-bold text-navy">{copy.activityInRange}</h3>
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label={copy.totals.reactions} value={data.counts.reactions} />
              <Metric label={copy.totals.comments} value={data.counts.comments} />
              <Metric label={copy.totals.shares} value={data.counts.shares} />
              <Metric label={copy.totals.views} value={data.counts.views} hint={copy.viewsHint} />
              <Metric label={copy.totals.chats} value={data.counts.chats} />
              <Metric label={copy.totals.posts} value={data.counts.posts} />
            </div>
          </section>

          <section aria-label={copy.chatQuestions}>
            <h3 className="mb-1 text-sm font-bold text-navy">{copy.chatQuestions}</h3>
            <p className="mb-3 text-xs text-text-muted">{copy.retention}</p>
            {questions.length === 0 ? (
              <p className="text-xs text-text-muted">{copy.chatEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {questions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink"
                  >
                    <span className="mr-3 text-xs text-text-muted">{formatDateTime(item.occurredAt)}</span>
                    {item.question}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <UserAiUsage userId={user.userId} range={range} />

          <section aria-label={copy.recentEvents}>
            <h3 className="mb-3 text-sm font-bold text-navy">{copy.recentEvents}</h3>
            {data.recentEvents.length === 0 ? (
              <p className="text-xs text-text-muted">{copy.recentEmpty}</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="ops-table" aria-label={copy.recentEvents}>
                  <tbody>
                    {data.recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="whitespace-nowrap">{formatDateTime(event.occurredAt)}</td>
                        <td className="font-semibold">{kindLabel(event.kind)}</td>
                        <td>{describeEvent(event)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </UserActivityDialog>
  );
}
