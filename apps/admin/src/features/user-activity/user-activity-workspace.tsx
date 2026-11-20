'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { userActivityControllerList } from '@tripflix/api-client/core-api/analytics/analytics';
import type { UserActivityListItemDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { Pagination } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { readEnumParam, readPageParam } from '@/ui/url-params';
import { useDetailParam } from '@/ui/use-detail-param';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { UserActivityDrawer } from './user-activity-drawer';
import { UserActivityChart } from './user-activity-overview';
import {
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
  const { openId, open, close, clear } = useDetailParam();
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
        <AdminButton size="sm" onClick={() => open(item.userId)}>
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
            clear();
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
          onRowOpen={(item) => open(item.userId)}
          selectedId={openId}
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
              clear();
            }}
          />
        ) : null}
      </section>

      {openId && (
        <UserActivityDrawer
          userId={openId}
          fallbackName={data?.items.find((item) => item.userId === openId)?.displayName}
          ids={data?.items.map((item) => item.userId) ?? []}
          range={range}
          onOpen={open}
          onClose={close}
        />
      )}
    </div>
  );
}
