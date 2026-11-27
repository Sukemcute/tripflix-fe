'use client';
import { useQuery } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { MetricStrip } from '@/ui/metric-strip';
import { TabPanel, Tabs } from '@/ui/tabs';
import { readEnumParam } from '@/ui/url-params';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { AppealQueue } from './appeal-queue';
import { CoverOcrMonitor } from './cover-ocr-monitor';
import { FailedScans } from './failed-scans';
import { ModerationKeywordRules } from './keyword-rules';
import { ModerationLog } from './moderation-log';
import { ModerationQueue } from './moderation-queue';
import { MODERATION_TABS, REFRESH_MS, formatDateTime } from './moderation-shared';
import { PostModeration } from './post-moderation';

const text = vi.moderation;
const copy = vi.moderationConsole;
const reviewText = vi.moderation.review;

/**
 * Màn Kiểm duyệt: dải số liệu (mỗi ô dẫn tới hàng đã lọc) và nội dung của tab đang chọn.
 * Tab, bộ lọc và hồ sơ đang mở đều nằm trên URL nên F5 và liên kết chia sẻ giữ nguyên ngữ cảnh.
 */
export function ModerationWorkspace() {
  const { user } = useApiSession();
  const tabs = user?.role === 'superadmin' ? MODERATION_TABS : MODERATION_TABS.filter((id) => id !== 'settings');
  const { params, update } = useUrlParams();
  const tab = readEnumParam(params.get('tab'), tabs, 'queue');
  const view = params.get('view');
  const sla = params.get('sla');

  // Cùng khoá với shell nên dùng chung một lần gọi; số đếm do máy chủ tính (TF89).
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: REFRESH_MS,
  });
  const summary = stats.data;

  const goTo = (next: (typeof MODERATION_TABS)[number], filters: Record<string, string | null> = {}) =>
    update({ tab: next === 'queue' ? null : next, view: null, cat: null, assign: null, sla: null, q: null, id: null, ...filters });
  const isPendingQueue = tab === 'queue' && (!view || view === 'pending');

  return (
    <div className="space-y-4">
      <MetricStrip
        label={copy.metricsLabel}
        items={[
          {
            id: 'pending',
            label: text.kpiPending,
            value: summary?.pendingTotal,
            hint: summary ? `${summary.unassigned} ${reviewText.unassigned.toLowerCase()} · ${summary.assignedToMe} ${reviewText.mine.toLowerCase()}` : undefined,
            isActive: isPendingQueue && !sla,
            onClick: () => goTo('queue'),
          },
          {
            id: 'urgent',
            label: text.kpiUrgent,
            value: summary?.pendingUrgent,
            isUrgent: true,
            hint: summary?.oldestPendingAt ? `${text.kpiOldestPending} ${formatDateTime(summary.oldestPendingAt)}` : undefined,
          },
          {
            id: 'overdue',
            label: reviewText.overdue,
            value: summary?.overdue,
            isUrgent: true,
            isActive: isPendingQueue && sla === 'overdue',
            onClick: () => goTo('queue', { sla: 'overdue' }),
          },
          {
            id: 'dueSoon',
            label: reviewText.dueSoon,
            value: summary?.dueSoon,
            isActive: isPendingQueue && sla === 'due_soon',
            onClick: () => goTo('queue', { sla: 'due_soon' }),
          },
          {
            id: 'failedScans',
            label: reviewText.failedScans,
            value: summary?.failedScans,
            isUrgent: true,
            isActive: tab === 'scans',
            onClick: () => goTo('scans'),
          },
          {
            id: 'reports',
            label: text.communityReports,
            value: summary?.reports24h,
            hint: summary ? `${text.kpiAutoHidden24h} ${summary.autoHidden24h}` : undefined,
          },
        ]}
      />
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />
      {summary && (summary.overdue > 0 || summary.failedScans > 0) && (
        <output className="block text-[13px] text-coral-ink">{reviewText.alert}</output>
      )}
      <p className="text-xs text-text-muted">{reviewText.policy}</p>

      <Tabs
        label={copy.tabsLabel}
        idPrefix="moderation"
        active={tab}
        onChange={(next) => goTo(next)}
        tabs={tabs.map((id) => ({
          id,
          label: copy.tabs[id],
          count: id === 'queue' ? summary?.pendingTotal : undefined,
        }))}
      />
      <TabPanel idPrefix="moderation" active={tab}>
        {tab === 'queue' && <ModerationQueue />}
        {tab === 'appeals' && <AppealQueue />}
        {tab === 'scans' && <FailedScans />}
        {tab === 'ocr' && <CoverOcrMonitor />}
        {tab === 'log' && <ModerationLog />}
        {tab === 'posts' && <PostModeration />}
        {tab === 'settings' && <ModerationKeywordRules />}
      </TabPanel>
    </div>
  );
}
