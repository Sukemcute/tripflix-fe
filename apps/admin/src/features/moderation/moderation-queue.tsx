'use client';
import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type {
  AdminModerationControllerQueueParams,
  DecisionDto,
  ModerationCaseDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { ConfirmDialog } from '@/ui/dialog';
import { FilterToolbar, SearchField, SelectField } from '@/ui/filter-toolbar';
import { LoadMore } from '@/ui/pagination';
import { Segmented } from '@/ui/segmented';
import { EmptyState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { getNeighbors } from '@/ui/detail-navigation';
import { readEnumParam } from '@/ui/url-params';
import { useDetailParam } from '@/ui/use-detail-param';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { CaseContextTags } from './case-context-tags';
import { CaseDrawer } from './case-drawer';
import {
  ASSIGNMENT_FILTERS,
  CATEGORY_FILTERS,
  QUEUE_VIEWS,
  REFRESH_MS,
  SLA_FILTERS,
  applyDecision,
  severityTone,
} from './moderation-shared';
import { ReviewStatus, useReviewTime } from './review-lease-panel';
import { getContentWarning } from './risk-level';
import { RiskTags } from './risk-tags';
import { useFreshIds } from './use-fresh-ids';

const text = vi.moderation;
const copy = vi.moderationConsole;
const reviewText = vi.moderation.review;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];

interface BulkOutcome {
  succeeded: number;
  failed: { id: string; error: unknown }[];
}

/** Hàng đợi hồ sơ: bộ lọc trên URL, bảng, xử lý hàng loạt và drawer chi tiết (`?id=`). */
export function ModerationQueue() {
  const client = useQueryClient();
  const { user } = useApiSession();
  const now = useReviewTime();
  const { params, update } = useUrlParams();
  const { openId, open, close, clear } = useDetailParam();
  const view = readEnumParam(params.get('view'), QUEUE_VIEWS, 'pending');
  const category = readEnumParam(params.get('cat'), CATEGORY_FILTERS, 'all');
  const assignment = readEnumParam(params.get('assign'), ASSIGNMENT_FILTERS, 'all');
  const sla = readEnumParam(params.get('sla'), SLA_FILTERS, 'all');
  const search = params.get('q') ?? '';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState<DecisionDto['reasonCode'] | ''>('');
  const [bulkResult, setBulkResult] = useState<BulkOutcome>();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const filters: AdminModerationControllerQueueParams = {
    assignment: view === 'pending' ? assignment : undefined,
    sla: view === 'pending' ? sla : undefined,
    search: search || undefined,
    view,
    targetType: category === 'comment' || category === 'post' ? category : undefined,
    source: category === 'report' ? 'report' : undefined,
  };
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'queue', user?.id, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => moderationApi.queue({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: REFRESH_MS,
  });
  const items = [
    ...new Map(query.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item] as const))).values(),
  ];
  const loadedIds = useMemo(
    () => query.data?.pages.flatMap((page) => page.items.map((item) => item.id)),
    [query.data],
  );
  const freshIds = useFreshIds(loadedIds);
  const total = query.data?.pages[0]?.total;
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const canSelect = view !== 'removed';
  const hasActiveFilters = !!(search || category !== 'all' || (view === 'pending' && (assignment !== 'all' || sla !== 'all')));

  // Đổi bộ lọc thì bỏ chọn và đóng hồ sơ đang mở: tập hồ sơ hiển thị đã khác.
  const setFilter = (patch: Record<string, string | null>) => {
    setSelectedIds([]);
    setBulkResult(undefined);
    update({ ...patch, id: null });
  };

  const bulk = useMutation({
    mutationFn: async ({ cases, body }: { cases: ModerationCaseDto[]; body: DecisionDto }) => {
      const failed: { id: string; error: unknown }[] = [];
      for (const item of cases) {
        try {
          const owned = item.status === 'pending' ? await moderationApi.reviewLease(item.id, 'claim') : item;
          await applyDecision(owned, body);
        } catch (error) {
          failed.push({ id: item.id, error });
        }
      }
      return { succeeded: cases.length - failed.length, failed };
    },
    onSuccess: async (result) => {
      setBulkResult(result);
      setSelectedIds(result.failed.map(({ id }) => id));
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['admin-posts'] }),
      ]);
    },
  });
  const runBulk = (action: DecisionDto['action']) => {
    if (!bulkReason || !selectedItems.length || bulk.isPending) return;
    setBulkResult(undefined);
    bulk.mutate({ cases: selectedItems, body: { action, reasonCode: bulkReason } });
  };

  const toggle = (id: string) =>
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const columns: DataColumn<ModerationCaseDto>[] = [
    ...(canSelect
      ? [
          {
            id: 'select',
            header: (
              <input
                type="checkbox"
                checked={allSelected}
                disabled={bulk.isPending || items.length === 0}
                onChange={() => setSelectedIds(allSelected ? [] : items.map((item) => item.id))}
                aria-label={copy.selectAll}
                className="accent-teal-ink"
              />
            ),
            className: 'w-9',
            cell: (item) => (
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                disabled={bulk.isPending}
                onChange={() => toggle(item.id)}
                aria-label={t('moderationConsole.selectCase', { id: item.id })}
                className="accent-teal-ink"
              />
            ),
          } satisfies DataColumn<ModerationCaseDto>,
        ]
      : []),
    {
      id: 'content',
      header: copy.columns.content,
      openLabel: (item) =>
        t('moderationConsole.openCase', { title: item.targetPreview || `#${item.targetId.slice(0, 8)}` }),
      cell: (item) => {
        const kind = item.targetType === 'comment' ? copy.commentKind : copy.postKind;
        return (
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 break-words">
              {freshIds.has(item.id) && <StatusBadge tone="success" className="mr-1.5 align-middle">{vi.adminOperations.freshCase}</StatusBadge>}
              {item.targetPreview || `${kind} #${item.targetId.slice(0, 8)}`}
            </p>
            <p className="text-xs text-text-muted">
              {kind} · {text.author}: {item.authorId ? item.authorId.slice(0, 8) : '—'}
            </p>
            <CaseContextTags item={item} visibility={view} />
            <RiskTags item={item} />
          </div>
        );
      },
    },
    {
      id: 'reports',
      header: copy.columns.reports,
      align: 'right',
      hideBelow: 'sm',
      cell: (item) => (
        <span className={item.reportCount > 0 ? 'text-coral-ink' : 'text-text-muted'}>{item.reportCount}</span>
      ),
    },
    {
      id: 'priority',
      header: copy.columns.priority,
      align: 'right',
      cell: (item) => (
        <StatusBadge tone={severityTone(getContentWarning(item.flags) ? Math.max(50, item.severity) : item.severity)}>
          {item.severity}
        </StatusBadge>
      ),
    },
    ...(view === 'pending'
      ? [
          {
            id: 'assignment',
            header: copy.columns.assignment,
            hideBelow: 'lg',
            cell: (item) => <ReviewStatus item={item} actorId={user?.id} now={now} />,
          } satisfies DataColumn<ModerationCaseDto>,
        ]
      : []),
  ];

  const ids = items.map((item) => item.id);
  /** Sau khi quyết định: sang hồ sơ kế tiếp (hoặc liền trước nếu là hồ sơ cuối); hết thì đóng. */
  const advanceAfterDecision = () => {
    if (!openId) return;
    const { nextId, previousId } = getNeighbors(ids, openId);
    const target = nextId ?? previousId;
    if (target) open(target);
    else clear();
  };

  return (
    <div className="space-y-3">
      <FilterToolbar
        hasActiveFilters={hasActiveFilters}
        onReset={() => setFilter({ q: null, cat: null, assign: null, sla: null })}
        summary={total !== undefined ? `${items.length} / ${total.toLocaleString('vi-VN')} · ${copy.sortNote}` : copy.sortNote}
        actions={
          freshIds.size > 0 ? (
            <AdminButton
              size="sm"
              onClick={() =>
                document
                  .querySelector('[data-fresh-case="true"]')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            >
              {t('moderationConsole.newCases', { count: freshIds.size })}
            </AdminButton>
          ) : undefined
        }
      >
        <Segmented
          label={copy.viewsLabel}
          value={view}
          disabled={bulk.isPending}
          options={QUEUE_VIEWS.map((id) => ({ id, label: copy.views[id] }))}
          onChange={(next) => setFilter({ view: next === 'pending' ? null : next, assign: null, sla: null })}
        />
        <SearchField
          label={copy.searchLabel}
          placeholder={reviewText.search}
          maxLength={160}
          value={search}
          onChange={(value) => setFilter({ q: value })}
        />
        <SelectField
          label={copy.categoryLabel}
          value={category === 'all' ? '' : category}
          allLabel={copy.categories.all}
          options={CATEGORY_FILTERS.filter((id) => id !== 'all').map((id) => ({ value: id, label: copy.categories[id] }))}
          onChange={(value) => setFilter({ cat: value })}
        />
        {view === 'pending' && (
          <>
            <SelectField
              label={reviewText.assignment}
              value={assignment === 'all' ? '' : assignment}
              allLabel={reviewText.allAssignments}
              options={[
                { value: 'unassigned', label: reviewText.unassigned },
                { value: 'mine', label: reviewText.mine },
              ]}
              onChange={(value) => setFilter({ assign: value })}
            />
            <SelectField
              label={reviewText.deadline}
              value={sla === 'all' ? '' : sla}
              allLabel={reviewText.allDeadlines}
              options={[
                { value: 'overdue', label: reviewText.overdue },
                { value: 'due_soon', label: reviewText.dueSoon },
              ]}
              onChange={(value) => setFilter({ sla: value })}
            />
          </>
        )}
      </FilterToolbar>

      {selectedItems.length > 0 && (
        <section
          aria-label={copy.bulk.reasonLabel}
          className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-adm border border-border bg-surface px-3 py-2"
        >
          <span className="text-[13px] tabular-nums">
            {t('moderationConsole.bulk.selected', { count: selectedItems.length })}
          </span>
          <SelectField
            label={copy.bulk.reasonLabel}
            value={bulkReason}
            allLabel={text.chooseReason}
            options={reasonKeys.map((key) => ({ value: key, label: text.reasons[key] }))}
            onChange={(value) => setBulkReason(value as typeof bulkReason)}
          />
          {view !== 'hidden' && (
            <AdminButton disabled={!bulkReason || bulk.isPending} onClick={() => runBulk('hide')}>
              {copy.bulk.hide}
            </AdminButton>
          )}
          {view === 'hidden' && (
            <AdminButton disabled={!bulkReason || bulk.isPending} onClick={() => runBulk('restore')}>
              {copy.bulk.restore}
            </AdminButton>
          )}
          <AdminButton variant="danger" disabled={!bulkReason || bulk.isPending} onClick={() => setIsRemoveOpen(true)}>
            {copy.bulk.remove}
          </AdminButton>
          <AdminButton variant="ghost" disabled={bulk.isPending} onClick={() => setSelectedIds([])}>
            {copy.bulk.clear}
          </AdminButton>
          {bulk.isPending && <output className="text-xs text-text-muted">{copy.bulk.working}</output>}
        </section>
      )}
      {bulkResult && (
        <div className="space-y-1 text-[13px]">
          <output>
            {t('moderationConsole.bulk.result', { done: bulkResult.succeeded, failed: bulkResult.failed.length })}
          </output>
          {bulkResult.failed.map(({ id, error }) => (
            <div key={id} className="flex flex-wrap items-center gap-2">
              <AdminButton size="sm" onClick={() => open(id)}>
                {t('moderationConsole.bulk.failedCase', { id: id.slice(0, 8) })}
              </AdminButton>
              <AdminApiError error={error} />
            </div>
          ))}
        </div>
      )}
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <DataTable
        label={copy.queueTable}
        columns={columns}
        rows={items}
        getRowId={(item) => item.id}
        onRowOpen={(item) => open(item.id)}
        openColumnId="content"
        selectedId={openId}
        isLoading={query.isPending}
        rowProps={(item) => ({ 'data-fresh-case': freshIds.has(item.id) || undefined })}
        rowClassName={(item) => (freshIds.has(item.id) ? 'bg-sea-mist/60' : undefined)}
        empty={!query.error && <EmptyState title={copy.emptyTitle} description={copy.emptyHint} />}
      />
      {items.length > 0 && (
        <LoadMore
          shown={items.length}
          total={total}
          hasMore={!!query.hasNextPage}
          isFetching={query.isFetching || bulk.isPending}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
      {openId && (
        <CaseDrawer id={openId} ids={ids} onOpen={open} onClose={close} onDecided={advanceAfterDecision} />
      )}
      {isRemoveOpen && (
        <ConfirmDialog
          title={copy.bulk.removeTitle}
          description={t('moderationConsole.bulk.removeBody', { count: selectedItems.length })}
          confirmLabel={copy.bulk.remove}
          tone="danger"
          onClose={() => setIsRemoveOpen(false)}
          onConfirm={() => {
            setIsRemoveOpen(false);
            runBulk('remove');
          }}
        />
      )}
    </div>
  );
}
