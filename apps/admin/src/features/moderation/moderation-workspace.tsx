'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type {
  AdminModerationControllerQueueParams,
  DecisionDto,
  ModerationCaseDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStaffLive } from '../live/staff-live';
import { AdminApiError } from '../shell/api-state';
import { formatNumber, formatRelative, shortId } from '../ui/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Segmented,
  Skeleton,
  StatTile,
  controlClass,
  fieldLabelClass,
  tableClass,
  tdClass,
  thClass,
} from '../ui/primitives';
import { useNow } from '../ui/use-now';
import { applyDecision, CaseDetailDrawer } from './case-detail-drawer';
import { CaseContextTags, RiskTags, SeverityMeter } from './case-context-tags';
import { ModerationLog } from './moderation-log';
import { AppealQueue, FailedScans } from './moderation-operations';
import { PostModeration } from './post-moderation';
import { getContentWarning } from './risk-level';

const text = vi.moderation;
const copy = vi.adminConsole.moderation;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];
/** Hồ sơ mới đến được tô sáng bấy lâu để mắt kịp bắt. */
const NEW_HIGHLIGHT_MS = 8_000;

type QueueView = NonNullable<AdminModerationControllerQueueParams['view']>;
type WorkspaceTab = QueueView | 'appeals' | 'scans' | 'log' | 'posts';
const WORKSPACE_TABS: readonly WorkspaceTab[] = ['pending', 'reviewed', 'hidden', 'removed', 'appeals', 'scans', 'log', 'posts'];
const queueTabs: Record<QueueView, string> = { pending: 'Chờ duyệt', reviewed: 'Đã duyệt', hidden: 'Đã ẩn', removed: 'Đã gỡ' };
const destination: Record<DecisionDto['action'], QueueView> = {
  hide: 'hidden',
  restore: 'reviewed',
  remove: 'removed',
  dismiss: 'reviewed',
};

function parseTab(value: string | null): WorkspaceTab {
  return value && (WORKSPACE_TABS as readonly string[]).includes(value) ? (value as WorkspaceTab) : 'pending';
}

export function ModerationWorkspace() {
  // ?tab= và ?case= đến từ Tổng quan và Cảnh báo; đổi link trong lúc đang mở trang thì cập nhật theo.
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<WorkspaceTab>(() => parseTab(searchParams.get('tab')));
  const [openCaseId, setOpenCaseId] = useState<string | null>(() => searchParams.get('case'));
  const [linkedParams, setLinkedParams] = useState(searchParams.toString());
  if (linkedParams !== searchParams.toString()) {
    setLinkedParams(searchParams.toString());
    setTab(parseTab(searchParams.get('tab')));
    setOpenCaseId(searchParams.get('case'));
  }
  const { stats } = useStaffLive();
  const summary = stats.data;

  const value = (count: number | undefined) => (count === undefined ? (stats.isError ? '—' : '…') : formatNumber(count));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <section
        aria-label={text.monitoringTitle}
        aria-busy={stats.isPending}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatTile
          label={text.kpiPending}
          icon="inbox"
          tone="navy"
          value={value(summary?.pendingTotal)}
          sub={summary && t('adminConsole.overview.kpiPendingSub', { posts: summary.pendingPosts, comments: summary.pendingComments })}
        />
        <StatTile
          label={text.kpiUrgent}
          icon="alert"
          tone="danger"
          isHighlighted={!!summary?.pendingUrgent}
          value={value(summary?.pendingUrgent)}
          sub={summary?.oldestPendingAt ? `${text.kpiOldestPending} ${formatRelative(summary.oldestPendingAt)}` : text.kpiUrgentHint}
        />
        <StatTile
          label={text.kpiAutoHidden24h}
          icon="shield"
          tone="teal"
          value={value(summary?.autoHidden24h)}
          sub={summary && summary.autoHidden24h === 0 ? text.kpiAutoHiddenNone : vi.adminConsole.overview.kpiAutoHiddenSub}
        />
        <StatTile
          label={text.communityReports}
          icon="users"
          tone="coral"
          value={value(summary?.reports24h)}
          sub={text.kpiReports24h}
        />
      </section>
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />

      <Segmented
        ariaLabel="Khu vực kiểm duyệt"
        value={tab}
        onChange={setTab}
        items={[
          ...(Object.keys(queueTabs) as QueueView[]).map((view) => ({
            id: view,
            label: view === 'pending' && summary ? `${queueTabs[view]} (${summary.pendingTotal})` : queueTabs[view],
          })),
          { id: 'appeals', label: 'Khiếu nại', count: summary?.pendingAppeals, tone: 'danger' as const },
          { id: 'scans', label: 'Scan cần phục hồi', count: summary?.failedScans, tone: 'danger' as const },
          { id: 'log', label: 'Nhật ký thao tác' },
          { id: 'posts', label: 'Quản lý bài viết' },
        ]}
      />

      {tab === 'scans' ? (
        <FailedScans />
      ) : tab === 'appeals' ? (
        <AppealQueue />
      ) : tab === 'log' ? (
        <ModerationLog />
      ) : tab === 'posts' ? (
        <PostModeration />
      ) : (
        <ModerationQueue
          key={tab}
          view={tab}
          onOpenCase={setOpenCaseId}
        />
      )}

      <CaseDetailDrawer
        id={openCaseId}
        onClose={() => setOpenCaseId(null)}
        onDecision={(action) => {
          if (WORKSPACE_TABS.indexOf(tab) < 4) setTab(destination[action]);
        }}
      />
    </div>
  );
}

type Scope = 'all' | 'post' | 'comment' | 'report';

function ModerationQueue({ view, onOpenCase }: { view: QueueView; onOpenCase: (id: string) => void }) {
  const client = useQueryClient();
  const { pollMs } = useStaffLive();
  const now = useNow();
  const [scope, setScope] = useState<Scope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState<DecisionDto['reasonCode'] | ''>('');
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: { id: string; error: unknown }[] }>();
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string> | null>(null);

  const filters: AdminModerationControllerQueueParams = {
    view,
    targetType: scope === 'comment' || scope === 'post' ? scope : undefined,
    source: scope === 'report' ? 'report' : undefined,
  };
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'queue', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => moderationApi.queue({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: pollMs,
  });

  const rawItems = [
    ...new Map(query.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item] as const))).values(),
  ];

  // Lần tải đầu chỉ ghi nhớ; các lần sau hồ sơ chưa từng thấy được tô sáng một lúc.
  useEffect(() => {
    if (!query.data) return;
    const ids = query.data.pages.flatMap((page) => page.items.map((item) => item.id));
    if (!seenIds.current) {
      seenIds.current = new Set(ids);
      return;
    }
    const arrived = ids.filter((id) => !seenIds.current!.has(id));
    ids.forEach((id) => seenIds.current!.add(id));
    if (!arrived.length) return;
    setFreshIds((current) => new Set([...current, ...arrived]));
    const timer = setTimeout(
      () => setFreshIds((current) => new Set([...current].filter((id) => !arrived.includes(id)))),
      NEW_HIGHLIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [query.data]);

  const filteredItems = rawItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.targetId.toLowerCase().includes(q) ||
      (item.authorId ?? '').toLowerCase().includes(q) ||
      !!item.targetPreview?.toLowerCase().includes(q)
    );
  });
  const selectedItems = filteredItems.filter((item) => selectedIds.includes(item.id));

  const bulk = useMutation({
    mutationFn: async ({ items, body }: { items: ModerationCaseDto[]; body: DecisionDto }) => {
      const failed: { id: string; error: unknown }[] = [];
      for (const item of items) {
        try {
          await applyDecision(item, body);
        } catch (error) {
          failed.push({ id: item.id, error });
        }
      }
      return { succeeded: items.length - failed.length, failed };
    },
    onSuccess: async (result) => {
      setBulkResult(result);
      setSelectedIds(result.failed.map(({ id }) => id));
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
    },
  });
  const runBulk = (action: DecisionDto['action']) => {
    if (!bulkReason || !selectedItems.length || bulk.isPending) return;
    if (
      action === 'remove' &&
      !window.confirm(
        `Gỡ ${selectedItems.length} mục khỏi giao diện người dùng? Gỡ bình luận gốc cũng gỡ các phản hồi của nó.`,
      )
    )
      return;
    setBulkResult(undefined);
    bulk.mutate({ items: selectedItems, body: { action, reasonCode: bulkReason } });
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  const isAllSelected = selectedItems.length === filteredItems.length && filteredItems.length > 0;
  const canSelect = view !== 'removed';

  return (
    <Card aria-label={queueTabs[view]}>
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
        <div className={fieldLabelClass}>
          {copy.scope}
          <Segmented
            ariaLabel="Phân loại nội dung kiểm duyệt"
            value={scope}
            isDisabled={bulk.isPending}
            onChange={(next) => {
              setSelectedIds([]);
              setScope(next);
            }}
            items={[
              { id: 'all', label: 'Tất cả nội dung' },
              { id: 'post', label: 'Bài viết, vlog và reel' },
              { id: 'comment', label: 'Bình luận' },
              { id: 'report', label: 'Báo cáo vi phạm' },
            ]}
          />
        </div>
        <label className={`${fieldLabelClass} min-w-56 flex-1`}>
          {copy.searchLabel}
          <input
            type="search"
            className={controlClass}
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            disabled={bulk.isPending}
            onChange={(event) => {
              setSelectedIds([]);
              setSearchQuery(event.target.value);
            }}
          />
        </label>
        {freshIds.size > 0 && (
          <Badge tone="teal" hasDot className="mb-2">
            {t('adminConsole.moderation.newArrivals', { count: freshIds.size })}
          </Badge>
        )}
      </div>

      {canSelect && selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-navy px-5 py-2.5 text-background">
          <strong className="text-sm">Đã chọn {selectedItems.length} nội dung</strong>
          <select
            aria-label="Lý do xử lý hàng loạt"
            className={`${controlClass} h-8 w-auto text-xs`}
            value={bulkReason}
            disabled={bulk.isPending}
            onChange={(event) => setBulkReason(event.target.value as typeof bulkReason)}
          >
            <option value="">Chọn lý do</option>
            {reasonKeys.map((key) => (
              <option key={key} value={key}>
                {text.reasons[key]}
              </option>
            ))}
          </select>
          {view !== 'hidden' && (
            <Button size="sm" disabled={!bulkReason || bulk.isPending} onClick={() => runBulk('hide')}>
              Ẩn (tạm thời)
            </Button>
          )}
          {view === 'hidden' && (
            <Button size="sm" variant="accent" disabled={!bulkReason || bulk.isPending} onClick={() => runBulk('restore')}>
              Khôi phục
            </Button>
          )}
          <Button size="sm" variant="danger" disabled={!bulkReason || bulk.isPending} onClick={() => runBulk('remove')}>
            Gỡ
          </Button>
          {bulk.isPending && <output className="text-xs">Đang xử lý các mục đã chọn…</output>}
          <button
            type="button"
            className="ml-auto text-xs font-semibold text-background/70 hover:text-background"
            onClick={() => setSelectedIds([])}
          >
            {copy.clearSelection}
          </button>
        </div>
      )}

      {bulkResult && (
        <div className="border-b border-border px-5 py-3 text-sm">
          <output>
            Đã xử lý {bulkResult.succeeded} mục. Có {bulkResult.failed.length} mục chưa xử lý được.
          </output>
          {bulkResult.failed.map(({ id, error }) => (
            <div key={id}>
              <button type="button" className="text-xs font-semibold text-teal-ink underline" onClick={() => onOpenCase(id)}>
                Hồ sơ {shortId(id)}
              </button>
              <AdminApiError error={error} />
            </div>
          ))}
        </div>
      )}

      <AdminApiError error={query.error} retry={() => void query.refetch()} />

      {query.isPending ? (
        <div className="flex flex-col gap-2 p-5" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState icon="check" title={copy.noCases} body={copy.noCasesHint} />
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={`${thClass} w-10`}>
                  <input
                    type="checkbox"
                    className="size-4 accent-teal"
                    checked={isAllSelected}
                    disabled={bulk.isPending || !canSelect}
                    onChange={() => setSelectedIds(isAllSelected ? [] : filteredItems.map((item) => item.id))}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className={thClass}>{copy.columnContent}</th>
                <th className={thClass}>{copy.columnReports}</th>
                <th className={thClass} title="Điểm ưu tiên hồ sơ từ chính sách Core, thang 0–100. AI gắn cờ đóng góp 60 điểm.">
                  {copy.columnPriority}
                </th>
                <th className={thClass}>{copy.columnCreated}</th>
                <th className={`${thClass} text-right`}>
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isFresh = freshIds.has(item.id);
                const categoryLabel = item.targetType === 'comment' ? 'Bình luận' : 'Bài viết';
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'transition-colors hover:bg-surface',
                      isFresh && 'bg-teal-soft/60',
                      selectedIds.includes(item.id) && 'bg-navy/5',
                    )}
                  >
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-teal"
                        checked={selectedIds.includes(item.id)}
                        disabled={bulk.isPending || !canSelect}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Chọn hồ sơ ${item.id}`}
                      />
                    </td>
                    <td className={`${tdClass} max-w-xl`} aria-label="Nội dung kiểm duyệt">
                      <div className="flex flex-col gap-1.5">
                        <span className="line-clamp-2 font-semibold text-text">
                          {isFresh && (
                            <Badge tone="teal" className="mr-1.5 align-middle">
                              Mới
                            </Badge>
                          )}
                          {item.targetPreview || `${categoryLabel} #${shortId(item.targetId)}`}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                          <span>@{shortId(item.authorId)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{categoryLabel}</span>
                        </span>
                        <CaseContextTags item={item} visibility={view} />
                        <RiskTags item={item} />
                      </div>
                    </td>
                    <td className={tdClass}>
                      <strong className={cn('tabular-nums', item.reportCount > 0 ? 'text-danger' : 'text-text-muted')}>
                        {item.reportCount}
                      </strong>
                    </td>
                    <td className={tdClass}>
                      <SeverityMeter severity={item.severity} isWarning={!!getContentWarning(item.flags)} />
                    </td>
                    <td className={`${tdClass} text-xs whitespace-nowrap text-text-muted`}>
                      <time dateTime={item.createdAt}>{formatRelative(item.createdAt, now)}</time>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Button size="sm" disabled={bulk.isPending} onClick={() => onOpenCase(item.id)}>
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-text-muted">
        <span>
          {t('adminConsole.moderation.showing', {
            shown: filteredItems.length,
            total: query.data?.pages[0]?.total ?? 0,
          })}{' '}
          · {copy.sortHint}
        </span>
        {query.hasNextPage && (
          <Button size="sm" disabled={query.isFetching || bulk.isPending} onClick={() => void query.fetchNextPage()}>
            {copy.loadMore}
          </Button>
        )}
      </footer>
    </Card>
  );
}
