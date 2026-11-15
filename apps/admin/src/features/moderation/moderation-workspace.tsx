'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi, socialApi, useApiSession } from '@tripflix/api-client';
import type {
  AdminModerationControllerActionsParams,
  AdminModerationControllerQueueParams,
  DecisionDto,
  ModerationCaseDto,
  ModerationLogDto,
} from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { PostModeration } from './post-moderation';
import { getContentWarning, getRiskLevel, getVisobertScore } from './risk-level';
import riskStyles from './risk-level.module.css';
import { CaseContextTags } from './case-context-tags';
import operations from './moderation-operations.module.css';

const text = vi.moderation;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const refreshInterval = 5_000;
type QueueView = NonNullable<AdminModerationControllerQueueParams['view']>;
const queueTabs = { pending: 'Chờ duyệt', reviewed: 'Đã duyệt', hidden: 'Đã ẩn', removed: 'Đã gỡ' };
const destination: Record<DecisionDto['action'], QueueView> = {
  hide: 'hidden',
  restore: 'reviewed',
  remove: 'removed',
  dismiss: 'reviewed',
};

async function applyDecision(item: ModerationCaseDto, body: DecisionDto): Promise<void> {
  if (item.status === 'pending') {
    await moderationApi.decide(item.id, body);
  } else if (item.targetType === 'comment') {
    await moderationApi.commentAction(item.targetId, body);
  } else if (body.action !== 'dismiss') {
    await socialApi.moderatePost(item.targetId, {
      action: body.action,
      reason_code: body.reasonCode,
      reason_detail: body.reasonDetail,
    });
  } else {
    throw new Error('Hồ sơ đã được duyệt');
  }
}

function getRiskBadgeClass(score: number) {
  if (score >= 90) return 'mod-risk-badge high-90';
  if (score >= 80) return 'mod-risk-badge high-80';
  if (score >= 50) return 'mod-risk-badge med-60';
  return 'mod-risk-badge low-30';
}

function RiskTags({ item }: { item: ModerationCaseDto }) {
  const level = getRiskLevel(item.severity);
  const warning = getContentWarning(item.flags);
  const score = getVisobertScore(item.flags);
  return (
    <div className={riskStyles.tags}>
      {warning ? (
        <span className={`${riskStyles.tag} ${riskStyles[warning.tone]}`}
          title="Dấu hiệu từ luật lọc tại lần đánh giá được lưu. Cần xem ngữ cảnh khi ra quyết định.">
          {warning.label}
        </span>
      ) : item.severity >= 50 ? (
        <span className={`${riskStyles.tag} ${riskStyles[level.tone]}`}>
          Ưu tiên {level.label.toLowerCase()}
        </span>
      ) : (
        <span className={`${riskStyles.tag} ${riskStyles.medium}`}>Cần xem xét</span>
      )}
      {score !== null && (
        <span className={`${riskStyles.tag} ${riskStyles.evidence}`}
          title="Score toxic của ViSoBERT tại lần đánh giá được lưu. Ngưỡng gắn cờ mặc định 0,97. Đây là score mô hình, chưa phải xác suất vi phạm đã hiệu chỉnh.">
          ViSoBERT {score.toFixed(4)}
        </span>
      )}
      {item.flags.aiUnavailable === true && (
        <span className={`${riskStyles.tag} ${riskStyles.medium}`}
          title="Core không nhận được verdict AI hợp lệ ở lần đánh giá được lưu. Đây là trạng thái lịch sử của hồ sơ, cần đối chiếu log để biết nguyên nhân và trạng thái hiện tại.">
          Chưa có kết quả AI ở lần đánh giá này
        </span>
      )}
    </div>
  );
}

export function ModerationWorkspace() {
  const [tab, setTab] = useState<QueueView | 'log' | 'posts' | 'appeals' | 'scans'>('pending');

  // Số liệu đếm ở server (TF89): không cắt theo 100 dòng đầu như khi đếm ở FE.
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: refreshInterval,
  });
  const summary = stats.data;
  const show = (value: number | undefined) => (summary ? value : stats.isError ? '—' : '…');
  const pendingTotal = summary?.pendingTotal;
  const urgentCount = summary?.pendingUrgent ?? 0;
  const autoHiddenCount = summary?.autoHidden24h ?? 0;

  return (
    <div className="mod-workspace-container">
      {/* 4 Thẻ KPI Giám sát Vận hành Thời gian thực */}
      <section className="admin-mod-monitoring-header" aria-label={text.monitoringTitle} aria-busy={stats.isPending}>
        <div className="mod-monitor-card card-pending">
          <span className="mod-monitor-label">📋 {text.kpiPending}</span>
          <strong className="mod-monitor-value">{show(summary?.pendingTotal)}</strong>
          <span className={`mod-monitor-sub ${urgentCount > 0 ? 'is-urgent' : ''}`}>
            {urgentCount > 0 ? `🚨 ${urgentCount} ${text.kpiUrgentCount}` : `✓ ${text.cleanEvidence}`}
          </span>
        </div>

        <div className="mod-monitor-card card-urgent">
          <span className="mod-monitor-label">🚨 {text.kpiUrgent}</span>
          <strong className="mod-monitor-value is-urgent">{show(summary?.pendingUrgent)}</strong>
          <span className="mod-monitor-sub">
            {summary?.oldestPendingAt
              ? `${text.kpiOldestPending} ${date(summary.oldestPendingAt)}`
              : text.kpiUrgentHint}
          </span>
        </div>

        <div className="mod-monitor-card card-engine">
          <span className="mod-monitor-label">🤖 {text.activeEngine}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" />
            <strong style={{ fontSize: 16, fontWeight: 700 }}>{text.engineStatus}</strong>
          </div>
          <span className="mod-monitor-sub">
            {autoHiddenCount > 0 ? `${text.kpiAutoHidden24h} ${autoHiddenCount}` : text.kpiAutoHiddenNone}
          </span>
        </div>

        <div className="mod-monitor-card card-sla">
          <span className="mod-monitor-label">👥 {text.communityReports}</span>
          <strong className="mod-monitor-value is-good">{show(summary?.reports24h)}</strong>
          <span className="mod-monitor-sub">
            {summary ? `${text.kpiReports24h} · ${text.kpiUpdatedAt} ${date(summary.generatedAt)}` : text.kpiReports24h}
          </span>
        </div>
      </section>
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />

      {/* Header Hàng tab chính theo Mockup Screen 2 */}
      <div className="mod-header-row">
        <div className="mod-tabs-main">
          {(Object.keys(queueTabs) as QueueView[]).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={tab === view}
              className={`mod-tab-btn ${tab === view ? 'is-active' : ''}`}
              onClick={() => setTab(view)}
            >
              {queueTabs[view]}
              {view === 'pending' && pendingTotal !== undefined && ` (${pendingTotal})`}
            </button>
          ))}
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'appeals' ? 'is-active' : ''}`}
            onClick={() => setTab('appeals')}
          >
            Khiếu nại
          </button>
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'scans' ? 'is-active' : ''}`}
            onClick={() => setTab('scans')}
          >
            Scan cần phục hồi
          </button>
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'log' ? 'is-active' : ''}`}
            onClick={() => setTab('log')}
          >
            Nhật ký thao tác
          </button>
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'posts' ? 'is-active' : ''}`}
            onClick={() => setTab('posts')}
          >
            Quản lý bài viết
          </button>
        </div>
      </div>

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
          onDecision={(action) => setTab((current) => (current === tab ? destination[action] : current))}
        />
      )}
    </div>
  );
}

function AppealQueue() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'appeals'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.appeals(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const decision = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'upheld' | 'overturned' }) =>
      moderationApi.decideAppeal(id, outcome),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className={`mod-table-panel ${operations.panel}`} aria-label="Hàng chờ khiếu nại">
      <header className={operations.header}><div><h2>Khiếu nại đang chờ</h2><p>Đối chiếu quyết định gốc và nội dung hiện tại trước khi xét lại.</p></div><span className={operations.count}>{items.length} hồ sơ đã tải</span></header>
      <div className={operations.content}>
      {query.isPending && <output className={operations.empty}>Đang tải khiếu nại…</output>}
      {query.error && <AdminApiError error={query.error} />}
      {decision.error && <AdminApiError error={decision.error} />}
      {!query.isPending && !query.error && !items.length && <p className={operations.empty}>Không có khiếu nại đang chờ.</p>}
      {items.map(({ appeal, decision: original, targetText, targetStatus }) => (
        <article key={appeal.id} className={operations.appeal}>
          <header className={operations.scanTitle}><h3>{original.targetType === 'post' ? 'Bài viết' : 'Bình luận'}</h3><span className={operations.failed}>Chờ xét lại</span><time className={operations.meta} dateTime={appeal.createdAt}>{date(appeal.createdAt)}</time></header>
          <p className={operations.meta}>
            Quyết định: {({ hide: 'Ẩn', auto_hide: 'Tự động ẩn', remove: 'Gỡ', restore: 'Khôi phục', dismiss: 'Bỏ qua' } as Record<string, string>)[original.action] ?? original.action} · Lý do:{' '}
            {text.reasons[original.reasonCode as keyof typeof text.reasons] ?? original.reasonCode}
          </p>
          <div className={operations.appealReason}><strong>Nội dung khiếu nại</strong><p>{appeal.reason}</p></div>
          <div className={operations.evidenceGrid}>
          <section><h4>Bằng chứng lúc quyết định</h4><p>
            {typeof original.evidenceSnapshot?.text === 'string'
              ? original.evidenceSnapshot.text
              : 'Quyết định cũ chưa lưu snapshot'}
          </p><p className={operations.meta}>Chính sách: {original.policyVersion ?? 'Chưa ghi phiên bản'}</p></section>
          <section><h4>Nội dung hiện tại</h4><p>{targetText ?? 'Không khả dụng'}</p><p className={operations.meta}>Trạng thái: {({ hidden: 'Đang ẩn', removed: 'Đã gỡ', visible: 'Đang hiển thị', published: 'Đã công khai', draft: 'Bản nháp' } as Record<string, string>)[targetStatus ?? ''] ?? 'Không khả dụng'}</p></section>
          </div>
          <p className={operations.identifier}>
            Mã bài viết: {original.postId}
            {original.commentId ? ` · Bình luận: ${original.commentId}` : ''}
          </p>
          {!original.contentVersion && <p className={operations.hint}>Quyết định cũ thiếu phiên bản nội dung; cần xử lý thủ công.</p>}
          {original.moderatorId === user?.id && <p className={operations.hint}>Bạn đã ra quyết định gốc. Cần một kiểm duyệt viên khác xét khiếu nại này.</p>}
          <div className={operations.appealActions}>
          <button
            className={operations.button}
            type="button"
            disabled={decision.isPending || original.moderatorId === user?.id}
            onClick={() => decision.mutate({ id: appeal.id, outcome: 'upheld' })}
          >
            Giữ quyết định
          </button>{' '}
          <button
            className={`${operations.button} ${operations.accept}`}
            type="button"
            disabled={decision.isPending || !original.contentVersion || original.moderatorId === user?.id}
            onClick={() => {
              if (window.confirm('Chấp nhận khiếu nại và khôi phục nội dung nếu còn đủ điều kiện?'))
                decision.mutate({ id: appeal.id, outcome: 'overturned' });
            }}
          >
            Chấp nhận khiếu nại
          </button>
          </div>
        </article>
      ))}
      {query.hasNextPage && (
        <button className={operations.button} type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Xem thêm
        </button>
      )}
      </div>
    </section>
  );
}

function FailedScans() {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'failed-scans'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.failedScans(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const retry = useMutation({
    mutationFn: (id: string) => moderationApi.retryScan(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['moderation', 'failed-scans'] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className={`mod-table-panel ${operations.panel}`} aria-label="Scan cần phục hồi">
      <header className={operations.header}>
        <div><h2>Scan cần phục hồi</h2><p>Các lượt kiểm tra đã hết số lần tự động thử lại.</p></div>
        <span className={operations.count}>{items.length} scan đã tải</span>
      </header>
      <div className={operations.content}>
      <p className={operations.hint}>
        Kiểm tra AI đã hoạt động trước khi lên lịch thử lại. Hệ thống vẫn kiểm tra phiên bản và quyết định của
        moderator.
      </p>
      {query.isPending && <output className={operations.empty}>Đang tải scan…</output>}
      <AdminApiError error={query.error ?? retry.error} />
      {retry.isSuccess && <output className={operations.success}>Đã lên lịch kiểm tra lại nội dung.</output>}
      {!query.isPending && !query.error && !items.length && <p className={operations.empty}>Không có scan cần phục hồi.</p>}
      <div className={operations.scans}>
      {items.map((item) => (
        <article key={item.eventId} className={operations.scan}>
          <div className={operations.scanInfo}>
            <div className={operations.scanTitle}><h3>{item.targetType === 'post' ? 'Bài viết' : 'Bình luận'}</h3><span className={operations.failed}>Hết lượt tự thử</span></div>
            <p className={operations.identifier}>ID nội dung: <code>{item.targetId}</code></p>
            <p className={operations.meta}>{item.attempts} lần thử · Cập nhật {date(item.updatedAt)}</p>
          </div>
          <button className={operations.button} type="button" disabled={retry.isPending} onClick={() => retry.mutate(item.eventId)}>
            {retry.isPending && retry.variables === item.eventId ? 'Đang lên lịch…' : 'Lên lịch thử lại'}
          </button>
        </article>
      ))}
      </div>
      {query.hasNextPage && (
        <button className={operations.button} type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
        </button>
      )}
      </div>
    </section>
  );
}

function ModerationQueue({
  view,
  onDecision,
}: {
  view: QueueView;
  onDecision: (action: DecisionDto['action']) => void;
}) {
  const client = useQueryClient();
  const [subCategory, setSubCategory] = useState<'all' | 'post' | 'comment' | 'report'>('all');
  const filters: AdminModerationControllerQueueParams = {
    view,
    targetType: subCategory === 'comment' || subCategory === 'post' ? subCategory : undefined,
    source: subCategory === 'report' ? 'report' : undefined,
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDossierId, setActiveDossierId] = useState<string | null>(null);
  const [bulkReason, setBulkReason] = useState<DecisionDto['reasonCode'] | ''>('');
  const [bulkResult, setBulkResult] = useState<{
    succeeded: number;
    failed: { id: string; error: unknown }[];
  }>();

  const query = useInfiniteQuery({
    queryKey: ['moderation', 'queue', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => moderationApi.queue({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: refreshInterval,
  });

  const rawItems = [
    ...new Map(
      query.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item] as const)),
    ).values(),
  ];

  // Lọc theo subcategory và ô tìm kiếm
  const filteredItems = rawItems.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q) || item.targetId.toLowerCase().includes(q);
      const matchAuthor = (item.authorId ?? '').toLowerCase().includes(q);
      if (!matchId && !matchAuthor && !item.targetPreview?.toLowerCase().includes(q)) return false;
    }
    return true;
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
    onSuccess: async (result, { body }) => {
      setBulkResult(result);
      setSelectedIds(result.failed.map(({ id }) => id));
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
      if (!result.failed.length) onDecision(body.action);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  return (
    <>
      {/* Thanh Bộ lọc & Tìm kiếm (Filter Bar) */}
      <div className="mod-filter-bar">
        <div className="mod-filter-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="mod-filter-label">Tìm kiếm</span>
          <input
            type="text"
            className="mod-search-input"
            placeholder="Tìm trên các hồ sơ đã tải"
            value={searchQuery}
            disabled={bulk.isPending}
            onChange={(e) => {
              setSelectedIds([]);
              setSearchQuery(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Chia Layout: Subnav Menu bên trái + Bảng Danh sách bên phải */}
      <div className="mod-split-layout">
        {/* Subnav Trái */}
        <aside className="mod-subnav-card" aria-label="Phân loại nội dung kiểm duyệt">
          {(
            [
              ['all', 'Tất cả nội dung'],
              ['post', 'Bài viết, vlog và reel'],
              ['comment', 'Bình luận'],
              ['report', 'Báo cáo vi phạm'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={bulk.isPending}
              aria-pressed={subCategory === key}
              className={`mod-subnav-btn ${subCategory === key ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedIds([]);
                setSubCategory(key);
              }}
            >
              <span>{label}</span>
            </button>
          ))}
        </aside>

        {/* Khung Bảng Danh Sách */}
        <div className="mod-table-panel">
          {/* Thanh Thao Tác Hàng Loạt */}
          <div className="mod-bulk-toolbar">
            <div className="mod-bulk-left">
              <span style={{ fontWeight: 600, color: '#0F172A' }}>
                Đã chọn {selectedItems.length} nội dung
              </span>
              {view !== 'removed' && (
                <>
                  <select
                    aria-label="Lý do xử lý hàng loạt"
                    className="mod-filter-select"
                    value={bulkReason}
                    disabled={bulk.isPending}
                    onChange={(e) => setBulkReason(e.target.value as typeof bulkReason)}
                  >
                    <option value="">Chọn lý do</option>
                    {reasonKeys.map((key) => (
                      <option key={key} value={key}>
                        {text.reasons[key]}
                      </option>
                    ))}
                  </select>
                  {view !== 'hidden' && (
                    <button
                      type="button"
                      className="mod-bulk-btn hide"
                      disabled={!selectedItems.length || !bulkReason || bulk.isPending}
                      onClick={() => runBulk('hide')}
                    >
                      Ẩn (tạm thời)
                    </button>
                  )}
                  {view === 'hidden' && (
                    <button
                      type="button"
                      className="mod-bulk-btn restore"
                      disabled={!selectedItems.length || !bulkReason || bulk.isPending}
                      onClick={() => runBulk('restore')}
                    >
                      Khôi phục
                    </button>
                  )}
                  <button
                    type="button"
                    className="mod-bulk-btn delete"
                    disabled={!selectedItems.length || !bulkReason || bulk.isPending}
                    onClick={() => runBulk('remove')}
                  >
                    Gỡ
                  </button>
                </>
              )}
              {bulk.isPending && <output>Đang xử lý các mục đã chọn…</output>}
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                Sắp xếp: <strong>Mức rủi ro giảm dần ▾</strong>
              </span>
            </div>
          </div>
          {bulkResult && (
            <div style={{ padding: 12 }}>
              <output>
                Đã xử lý {bulkResult.succeeded} mục. Có {bulkResult.failed.length} mục chưa xử lý được.
              </output>
              {bulkResult.failed.map(({ id, error }) => (
                <div key={id}>
                  <button type="button" onClick={() => setActiveDossierId(id)}>
                    Hồ sơ {id.slice(0, 8)}
                  </button>
                  <AdminApiError error={error} />
                </div>
              ))}
            </div>
          )}

          <AdminApiError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />

          {query.isPending && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <output>{vi.api.loading}</output>
            </div>
          )}

          {!query.isPending && filteredItems.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🎉</span>
              <h3>Không có hồ sơ nào</h3>
              <p style={{ fontSize: 12, marginTop: 6 }}>Hàng đợi hiện đang sạch sẽ hoặc không khớp bộ lọc.</p>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="mod-cases-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        disabled={bulk.isPending || view === 'removed'}
                        onChange={toggleSelectAll}
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <th>Nội dung</th>
                    <th>Thể loại</th>
                    <th>Số báo cáo</th>
                    <th title="Điểm ưu tiên hồ sơ từ chính sách Core, thang 0–100. AI gắn cờ đóng góp 60 điểm.">Điểm ưu tiên</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const categoryLabel = item.targetType === 'comment' ? 'Bình luận' : 'Bài viết';

                    return (
                      <tr key={item.id} className="mod-row-case">
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={bulk.isPending || view === 'removed'}
                            onChange={() => toggleSelect(item.id)}
                            aria-label={`Chọn hồ sơ ${item.id}`}
                          />
                        </td>
                        <td aria-label="Nội dung kiểm duyệt">
                          <div className="mod-content-cell">
                            <div className="mod-content-meta">
                              <span className="mod-content-title">
                                {item.targetPreview || `${categoryLabel} #${item.targetId.slice(0, 8)}`}
                              </span>
                              <div className="mod-content-sub">
                                <span>@{item.authorId ? item.authorId.slice(0, 8) : 'user_4587'}</span>
                                <span className="mod-type-tag">{categoryLabel}</span>
                              </div>
                              <CaseContextTags item={item} visibility={view} />
                              <RiskTags item={item} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: 500 }}>{categoryLabel}</span>
                        </td>
                        <td>
                          <strong style={{ color: item.reportCount > 0 ? '#DC2626' : '#64748B' }}>
                            {item.reportCount}
                          </strong>
                        </td>
                        <td>
                          <span className={getRiskBadgeClass(getContentWarning(item.flags) ? Math.max(50, item.severity) : item.severity)}>{item.severity}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="mod-btn-detail"
                            disabled={bulk.isPending}
                            onClick={() => setActiveDossierId(item.id)}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderTop: '1px solid #F1F5F9',
              fontSize: 12,
              color: '#64748B',
            }}
          >
            <span>
              Hiển thị {filteredItems.length} / {query.data?.pages[0]?.total ?? 0} hồ sơ
            </span>
            {query.hasNextPage && (
              <button
                type="button"
                className="mod-mini-tab"
                disabled={query.isFetching || bulk.isPending}
                onClick={() => void query.fetchNextPage()}
              >
                Tải thêm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Case Detail Modal (Screen 3 trong Mockup Image 2) */}
      {activeDossierId && (
        <CaseDetailModal
          id={activeDossierId}
          onClose={() => setActiveDossierId(null)}
          onDecision={onDecision}
        />
      )}
    </>
  );
}

/** Modal Chi Tiết Hồ Sơ Kiểm Duyệt (Screen 3 trong Image 2) */
function CaseDetailModal({
  id,
  onClose,
  onDecision,
}: {
  id: string;
  onClose: () => void;
  onDecision: (action: DecisionDto['action']) => void;
}) {
  const client = useQueryClient();
  const [modalTab, setModalTab] = useState<'info' | 'reports' | 'history'>('info');
  const [reasonCode, setReasonCode] = useState<DecisionDto['reasonCode'] | ''>('SPAM_OR_COMMERCIAL');
  const [notes, setNotes] = useState('');

  const detail = useQuery({
    queryKey: ['moderation', 'detail', id],
    queryFn: ({ signal }) => moderationApi.detail(id, signal),
  });

  const decision = useMutation({
    mutationFn: (action: DecisionDto['action']) => {
      if (!reasonCode || !detail.data) throw new Error(text.chooseReason);
      return applyDecision(detail.data, { action, reasonCode, reasonDetail: notes.trim() || undefined });
    },
    onSuccess: async (_, action) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
      onClose();
      if (action !== 'dismiss' || detail.data?.target?.status !== 'hidden') onDecision(action);
    },
  });

  const item = detail.data;

  return (
    <div className="mod-modal-overlay">
      <button
        type="button"
        className="mod-modal-backdrop-btn"
        onClick={onClose}
        aria-label="Đóng nền modal"
      />
      <dialog open className="mod-modal-dialog" aria-modal="true" aria-labelledby="mod-modal-heading">
        {/* Modal Header */}
        <div className="mod-modal-header">
          <h2 id="mod-modal-heading" className="mod-modal-title">
            Chi tiết nội dung kiểm duyệt
          </h2>
          <button type="button" className="mod-modal-close-btn" onClick={onClose} aria-label="Đóng modal">
            ✕
          </button>
        </div>

        {/* Modal Subtabs */}
        <div className="mod-modal-tabs">
          <button
            type="button"
            className={`mod-modal-tab ${modalTab === 'info' ? 'is-active' : ''}`}
            onClick={() => setModalTab('info')}
          >
            Thông tin
          </button>
          <button
            type="button"
            className={`mod-modal-tab ${modalTab === 'reports' ? 'is-active' : ''}`}
            onClick={() => setModalTab('reports')}
          >
            Báo cáo{item && ` (${item.reports.length})`}
          </button>
          <button
            type="button"
            className={`mod-modal-tab ${modalTab === 'history' ? 'is-active' : ''}`}
            onClick={() => setModalTab('history')}
          >
            Lịch sử xử lý
          </button>
        </div>

        {/* Modal Body */}
        <div className="mod-modal-body">
          <AdminApiError error={detail.error} />
          {detail.isPending && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <output>{vi.api.loading}</output>
            </div>
          )}

          {item && modalTab === 'info' && (
            <>
              {/* Mockup Video Player Preview */}
              <div className="mod-player-mockup">
                {/* Ảnh minh họa video */}
                <Image
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
                  alt="Video thumbnail review Phú Quốc"
                  className="mod-player-bg"
                  width={800}
                  height={400}
                  unoptimized
                />
                <button type="button" className="mod-play-center-btn" aria-label="Phát video kiểm duyệt">
                  ▶
                </button>
                <span className="mod-player-duration">02:34</span>
              </div>

              {/* Thông tin bài viết dưới Video */}
              <div className="mod-post-info-box">
                <h3 className="mod-post-title">{item.target?.text || 'Không có nội dung văn bản'}</h3>
                <div className="mod-post-author-row">
                  <span>@{item.authorId ? item.authorId.slice(0, 8) : 'user_4587'}</span>
                  <span>•</span>
                  <span>Hồ sơ tạo {date(item.createdAt)}</span>
                  <span className="mod-type-tag">{item.targetType === 'comment' ? 'Bình luận' : 'Bài viết'}</span>
                  <span className="mod-risk-tag-large">Ưu tiên {item.severity}/100 · {getRiskLevel(item.severity).label}</span>
                </div>
                <CaseContextTags item={item} visibility={item.target?.status} />
                <RiskTags item={item} />
                <p className={riskStyles.note}>
                  Điểm ưu tiên được tính từ luật, cờ AI và số báo cáo. AI gắn cờ đóng góp 60 điểm.
                  Hồ sơ có thể giữ điểm cao nhất từ các lần đánh giá trước. Cần xem bằng chứng và ngữ cảnh trước khi kết luận vi phạm.
                </p>
              </div>

              {/* Lưới Thông Số Kỹ Thuật (ID, Lượt xem, Báo cáo, Lý do) */}
              <div className="mod-meta-grid">
                <div className="mod-meta-item">
                  <span className="mod-meta-label">ID nội dung</span>
                  <strong className="mod-meta-val">#{item.targetId.slice(0, 7)}</strong>
                </div>
                <div className="mod-meta-item">
                  <span className="mod-meta-label">Loại</span>
                  <strong className="mod-meta-val">
                    {item.targetType === 'comment' ? 'Bình luận' : 'Reel / Video'}
                  </strong>
                </div>
                <div className="mod-meta-item">
                  <span className="mod-meta-label">Lượt xem</span>
                  <strong className="mod-meta-val">428.624</strong>
                </div>
                <div className="mod-meta-item">
                  <span className="mod-meta-label">Lượt thích</span>
                  <strong className="mod-meta-val">65.320</strong>
                </div>
                <div className="mod-meta-item">
                  <span className="mod-meta-label">Báo cáo</span>
                  <strong className="mod-meta-val">{item.reports.length}</strong>
                </div>
                <div className="mod-meta-item">
                  <span className="mod-meta-label">Lý do ghi nhận</span>
                  <strong className="mod-meta-val" style={{ color: '#DC2626' }}>
                    {[...new Set([
                      typeof item.flags.reasonCode === 'string' ? item.flags.reasonCode : null,
                      ...item.reports.map((report) => report.reasonCode),
                    ])].flatMap((code) => code && code in text.reasons ? [text.reasons[code as keyof typeof text.reasons]] : []).join(', ') || 'Chưa có lý do cụ thể'}
                  </strong>
                </div>
              </div>

              {/* Nhập nhận xét & chọn lý do xử lý */}
              <div className="mod-notes-wrap">
                <label className="mod-notes-label" htmlFor="mod-reason-select">
                  Lý do quyết định vi phạm <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  id="mod-reason-select"
                  className="mod-filter-select"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as typeof reasonCode)}
                >
                  {reasonKeys.map((k) => (
                    <option key={k} value={k}>
                      {text.reasons[k]}
                    </option>
                  ))}
                </select>

                <label className="mod-notes-label" htmlFor="mod-notes-input" style={{ marginTop: 8 }}>
                  Nhận xét xử lý
                </label>
                <textarea
                  id="mod-notes-input"
                  className="mod-notes-textarea"
                  placeholder="Nhập nhận xét (bắt buộc)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <AdminApiError error={decision.error} />
            </>
          )}

          {item && modalTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {item.reports.length === 0 ? (
                <p style={{ color: '#64748B' }}>Chưa có báo cáo người dùng trực tiếp.</p>
              ) : (
                item.reports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: '#F8FAFC',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <strong>{text.reasons[r.reasonCode as keyof typeof text.reasons] ?? r.reasonCode}</strong>
                    {r.reasonDetail && <p style={{ margin: '4px 0 0', fontSize: 12 }}>{r.reasonDetail}</p>}
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{date(r.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {item && modalTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LogTable items={item.actions} />
            </div>
          )}
        </div>

        {/* Modal Footer với các nút quyết định theo Screen 3 */}
        <div className="mod-modal-footer">
          <button type="button" className="btn-decision close" onClick={onClose}>
            Đóng
          </button>
          {item?.status === 'pending' && (
            <button
              type="button"
              className="btn-decision investigate"
              disabled={decision.isPending || !reasonCode}
              onClick={() => decision.mutate('dismiss')}
            >
              Đóng hồ sơ
            </button>
          )}
          {item?.target && ['visible', 'published'].includes(item.target.status) && (
            <button
              type="button"
              className="btn-decision hide"
              disabled={decision.isPending || !reasonCode}
              onClick={() => decision.mutate('hide')}
            >
              Ẩn (Tạm thời)
            </button>
          )}
          {item?.target && ['hidden', 'removed'].includes(item.target.status) && (
            <button
              type="button"
              className="btn-decision restore"
              disabled={decision.isPending || !reasonCode}
              onClick={() => decision.mutate('restore')}
            >
              Khôi phục
            </button>
          )}
          {item?.target && ['visible', 'published', 'hidden'].includes(item.target.status) && (
            <button
              type="button"
              className="btn-decision remove"
              disabled={decision.isPending || !reasonCode}
              onClick={() => {
                if (window.confirm('Gỡ nội dung này khỏi giao diện người dùng?')) decision.mutate('remove');
              }}
            >
              Gỡ
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}

function LogTable({ items }: { items: ModerationLogDto[] }) {
  if (!items.length) {
    return <p className={operations.empty}>Chưa có thao tác kiểm duyệt.</p>;
  }

  return (
    <div className={operations.tableScroll}>
      <table className={operations.table} aria-label="Nhật ký thao tác kiểm duyệt">
        <thead>
          <tr>
            <th>{text.time}</th>
            <th>{text.staff}</th>
            <th>{text.action}</th>
            <th>{text.reason}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((action) => {
            const actionLabel =
              action.action in text
                ? text[action.action as 'hide' | 'restore' | 'remove' | 'dismiss' | 'auto_hide']
                : action.action;
            return (
              <tr key={action.id}>
                <td><time dateTime={action.createdAt}>{date(action.createdAt)}</time></td>
                <td><span className={operations.actor}>{action.actorType === 'system' ? 'Hệ thống tự động' : 'Kiểm duyệt viên'}</span>{action.actorType !== 'system' && <code className={operations.actorId} title={action.moderatorId}>{action.moderatorId?.slice(0, 8) || 'Chưa xác định'}</code>}</td>
                <td>
                  <span className={`log-action-badge action-${action.action}`}>{actionLabel}</span>
                </td>
                <td>{text.reasons[action.reasonCode as keyof typeof text.reasons] ?? action.reasonCode}{action.reasonDetail && <p className={operations.reasonDetail}>{action.reasonDetail}</p>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModerationLog() {
  const [filters] = useState<AdminModerationControllerActionsParams>({});
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => moderationApi.log({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const rawItems = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className={`mod-table-panel ${operations.panel}`} aria-label="Nhật ký thao tác">
      <header className={operations.header}>
        <div><h2>Nhật ký thao tác kiểm duyệt</h2><p>Lịch sử quyết định của kiểm duyệt viên và hệ thống.</p></div>
        <span className={operations.count}>{rawItems.length} bản ghi đã tải</span>
      </header>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <output>{vi.api.loading}</output>
        </div>
      )}
      {!query.isPending && !query.error && <LogTable items={rawItems} />}
      {query.hasNextPage && <footer className={operations.footer}><button className={operations.button} type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}</button></footer>}
    </section>
  );
}
