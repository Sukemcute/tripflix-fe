'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  userActivityControllerDetail,
  userActivityControllerList,
} from '@tripflix/api-client/core-api/analytics/analytics';
import type { UserActivityListItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { UserActivityDialog } from './user-activity-dialog';
import { EmptyState, LoadingState, Metric, Panel } from '../shell/operations-ui';
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
export function UserActivityWorkspace() {
  const [days, setDays] = useState<UserActivityRangeDays>(7);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserActivityListItemDto | null>(null);
  const [openedAt] = useState(() => Date.now()); // mở trang qua nửa đêm thì tải lại để có ngày mới
  const range = userActivityRange(days, openedAt);
  const params = { ...range, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: ['admin', 'user-activity', params],
    queryFn: async ({ signal }) => (await userActivityControllerList(params, { signal })).data,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = list.isError ? undefined : list.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <span className="admin-badge">{copy.autoRefresh}</span>
      </div>

      <form className="admin-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          {copy.range}
          <select
            value={days}
            onChange={(event) => {
              setDays(Number(event.target.value) as UserActivityRangeDays);
              setPage(1);
              setSelected(null);
            }}
          >
            {USER_ACTIVITY_RANGES.map((value) => (
              <option key={value} value={value}>
                {copy.ranges[value]}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={copy.activeUsers} value={data?.total} />
      </div>

      {list.isError && <AdminApiError error={list.error} retry={() => void list.refetch()} />}

      <Panel title={copy.title} description={copy.retention}>
        {list.isPending ? (
          <LoadingState />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={copy.empty} />
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="ops-table" aria-label={copy.title}>
                <thead>
                  <tr>
                    <th scope="col">{copy.columns.user}</th>
                    <th scope="col">{copy.columns.email}</th>
                    <th scope="col">{copy.columns.reactions}</th>
                    <th scope="col">{copy.columns.comments}</th>
                    <th scope="col">{copy.columns.shares}</th>
                    <th scope="col">{copy.columns.views}</th>
                    <th scope="col">{copy.columns.chats}</th>
                    <th scope="col">{copy.columns.lastActiveAt}</th>
                    <th scope="col">
                      <span className="sr-only">{copy.viewDetail}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.userId} aria-selected={selected?.userId === item.userId}>
                      <td className="font-semibold text-navy">{item.displayName ?? copy.deletedAccount}</td>
                      <td>{item.email ?? '—'}</td>
                      <td className="tabular-nums">{count.format(item.reactions)}</td>
                      <td className="tabular-nums">{count.format(item.comments)}</td>
                      <td className="tabular-nums">{count.format(item.shares)}</td>
                      <td className="tabular-nums">{count.format(item.views)}</td>
                      <td className="tabular-nums">{count.format(item.chats)}</td>
                      <td>{formatDateTime(item.lastActiveAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-teal-ink hover:bg-teal-soft"
                          onClick={() => setSelected(item)}
                        >
                          {copy.viewDetail}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="flex items-center justify-end gap-3 px-5 py-4 text-xs text-text-muted">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
                disabled={page <= 1 || list.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                {copy.previous}
              </button>
              <span>{t('userActivity.pageOf', { page, pageCount })}</span>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
                disabled={page >= pageCount || list.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                {copy.next}
              </button>
            </nav>
          </>
        )}
      </Panel>

      {selected && <UserActivityDetail user={selected} range={range} onClose={() => setSelected(null)} />}
    </>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label={copy.totals.reactions} value={data.counts.reactions} />
            <Metric label={copy.totals.comments} value={data.counts.comments} />
            <Metric label={copy.totals.shares} value={data.counts.shares} />
            <Metric label={copy.totals.views} value={data.counts.views} />
            <Metric label={copy.totals.chats} value={data.counts.chats} />
          </div>

          <section aria-label={copy.chatQuestions}>
            <h3 className="mb-3 text-sm font-bold text-navy">{copy.chatQuestions}</h3>
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
