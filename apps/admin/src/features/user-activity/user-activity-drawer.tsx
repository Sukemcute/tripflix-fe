'use client';

import { useQuery } from '@tanstack/react-query';
import { userActivityControllerDetail } from '@tripflix/api-client/core-api/analytics/analytics';
import type { UserActivityDetailResponseDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { DetailDrawer } from '@/ui/detail-drawer';
import { DetailSection } from '@/ui/detail-parts';
import { MetricStrip } from '@/ui/metric-strip';
import { LoadingState } from '@/ui/states';
import { TabPanel, Tabs } from '@/ui/tabs';
import { buildDrawerNavigation } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { chatQuestion, describeEvent, kindLabel } from './user-activity-format';
import { UserAiUsage } from './user-ai-usage';

const copy = vi.userActivity;
const TAB_IDS = ['overview', 'activity', 'ai'] as const;
type DrawerTab = (typeof TAB_IDS)[number];
const REFRESH_MS = 30_000;
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});
const formatDateTime = (value: string | null) => (value ? dateTime.format(new Date(value)) : '—');

type RecentEvent = UserActivityDetailResponseDto['recentEvents'][number];

const eventColumns: DataColumn<RecentEvent>[] = [
  {
    id: 'time',
    header: copy.eventColumns.time,
    cell: (event) => <span className="whitespace-nowrap">{formatDateTime(event.occurredAt)}</span>,
  },
  { id: 'kind', header: copy.eventColumns.kind, cell: (event) => kindLabel(event.kind) },
  { id: 'detail', header: copy.eventColumns.detail, cell: (event) => describeEvent(event) },
];

/** Hành vi một người dùng trong drawer: tổng quan, hoạt động (câu hỏi gửi Tripi + sự kiện gần đây) và dùng AI. */
export function UserActivityDrawer({
  userId,
  fallbackName,
  ids,
  range,
  onOpen,
  onClose,
}: {
  userId: string;
  fallbackName?: string | null;
  ids: readonly string[];
  range: { from: string; to: string };
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('overview');
  const detail = useQuery({
    queryKey: ['admin', 'user-activity', userId, range],
    queryFn: async ({ signal }) => (await userActivityControllerDetail(userId, range, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const data = detail.isError ? undefined : detail.data;
  const name = data?.displayName ?? fallbackName ?? copy.deletedAccount;
  const questions = (data?.recentEvents ?? []).flatMap((event) => {
    const question = chatQuestion(event);
    return question ? [{ id: event.id, question, occurredAt: event.occurredAt }] : [];
  });

  return (
    <DetailDrawer
      size="wide"
      title={name}
      subtitle={data ? `${data.email} · ${copy.registeredAt}: ${formatDateTime(data.createdAt)}` : undefined}
      navigation={buildDrawerNavigation(ids, userId, onOpen)}
      scrollKey={userId}
      onClose={onClose}
      tabs={
        <Tabs
          label={name}
          idPrefix="user-activity"
          active={tab}
          onChange={setTab}
          tabs={TAB_IDS.map((value) => ({ id: value, label: copy.detailTabs[value] }))}
        />
      }
    >
      {detail.isError && <AdminApiError error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending ? (
        <LoadingState rows={5} />
      ) : data ? (
        <TabPanel idPrefix="user-activity" active={tab}>
          {tab === 'overview' && (
            <>
              <DetailSection title={copy.profile.title} description={copy.profile.hint}>
                <MetricStrip
                  label={copy.profile.title}
                  items={[
                    { id: 'followers', label: copy.profile.followers, value: data.profile.followerCount },
                    { id: 'following', label: copy.profile.following, value: data.profile.followingCount },
                    { id: 'likes', label: copy.profile.likes, value: data.profile.likeCount },
                    { id: 'posts', label: copy.profile.posts, value: data.profile.postCount },
                  ]}
                />
              </DetailSection>
              <DetailSection title={copy.activityInRange}>
                <MetricStrip
                  label={copy.activityInRange}
                  items={[
                    { id: 'reactions', label: copy.totals.reactions, value: data.counts.reactions },
                    { id: 'comments', label: copy.totals.comments, value: data.counts.comments },
                    { id: 'shares', label: copy.totals.shares, value: data.counts.shares },
                    { id: 'views', label: copy.totals.views, value: data.counts.views, hint: copy.viewsHint },
                    { id: 'chats', label: copy.totals.chats, value: data.counts.chats },
                    { id: 'posts', label: copy.totals.posts, value: data.counts.posts },
                  ]}
                />
              </DetailSection>
            </>
          )}
          {tab === 'activity' && (
            <>
              <DetailSection title={copy.chatQuestions} description={copy.retention}>
                {questions.length === 0 ? (
                  <p className="text-[13px] text-text-muted">{copy.chatEmpty}</p>
                ) : (
                  <ul className="divide-y divide-border border-y border-border">
                    {questions.map((item) => (
                      <li key={item.id} className="flex gap-3 py-2 text-[13px]">
                        <span className="w-28 shrink-0 text-xs text-text-muted">
                          {formatDateTime(item.occurredAt)}
                        </span>
                        <span className="min-w-0 break-words">{item.question}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
              <DetailSection title={copy.recentEvents}>
                <DataTable
                  label={copy.recentEvents}
                  columns={eventColumns}
                  rows={data.recentEvents}
                  getRowId={(event) => event.id}
                  empty={<p className="pt-3 text-[13px] text-text-muted">{copy.recentEmpty}</p>}
                />
              </DetailSection>
            </>
          )}
          {tab === 'ai' && <UserAiUsage userId={userId} range={range} />}
        </TabPanel>
      ) : null}
    </DetailDrawer>
  );
}
