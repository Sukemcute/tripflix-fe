'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type {
  AdminModerationControllerActionsParams,
  AdminModerationControllerQueueParams,
  AdminModerationControllerQueueTargetType,
  DecisionDto,
  ModerationLogDto,
} from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { PostModeration } from './post-moderation';

const text = vi.moderation;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const refreshInterval = 5_000;

function getRiskBadgeClass(score: number) {
  if (score >= 90) return 'mod-risk-badge high-90';
  if (score >= 80) return 'mod-risk-badge high-80';
  if (score >= 50) return 'mod-risk-badge med-60';
  return 'mod-risk-badge low-30';
}

export function ModerationWorkspace() {
  const [tab, setTab] = useState<'queue' | 'investigating' | 'resolved' | 'log' | 'posts'>('queue');

  // Truy vấn số liệu giám sát thời gian thực
  const pendingStats = useQuery({
    queryKey: ['moderation', 'stats', 'pending'],
    queryFn: ({ signal }) => moderationApi.queue({ status: 'pending', limit: 100 }, signal),
    refetchInterval: refreshInterval,
  });
  const logStats = useQuery({
    queryKey: ['moderation', 'stats', 'logs'],
    queryFn: ({ signal }) => moderationApi.log({ limit: 100 }, signal),
    refetchInterval: refreshInterval,
  });

  const pendingItems = pendingStats.data?.items ?? [];
  const pendingTotal = pendingStats.data?.total ?? pendingItems.length;
  const urgentCount = pendingItems.filter((item) => item.severity >= 80).length;
  const logItems = logStats.data?.items ?? [];
  const autoHiddenCount = logItems.filter((item) => item.action === 'auto_hide').length;
  const reportsCount = pendingItems.reduce((acc, curr) => acc + (curr.reportCount || 0), 0);

  return (
    <div className="mod-workspace-container">
      {/* 4 Thẻ KPI Giám sát Vận hành Thời gian thực */}
      <section className="admin-mod-monitoring-header" aria-label={text.monitoringTitle}>
        <div className="mod-monitor-card card-pending">
          <span className="mod-monitor-label">📋 {text.kpiPending}</span>
          <strong className="mod-monitor-value">
            {pendingStats.isPending ? '…' : pendingTotal}
          </strong>
          <span className="mod-monitor-sub" style={{ color: urgentCount > 0 ? 'var(--color-coral-ink)' : 'inherit' }}>
            {urgentCount > 0 ? `🚨 ${urgentCount} ${text.kpiUrgent.toLowerCase()}` : `✓ ${text.cleanEvidence}`}
          </span>
        </div>

        <div className="mod-monitor-card card-urgent">
          <span className="mod-monitor-label">🚨 {text.kpiUrgent}</span>
          <strong className="mod-monitor-value" style={{ color: 'var(--color-coral-ink)' }}>
            {pendingStats.isPending ? '…' : urgentCount}
          </strong>
          <span className="mod-monitor-sub">Cần ưu tiên xử lý trong ca</span>
        </div>

        <div className="mod-monitor-card card-engine">
          <span className="mod-monitor-label">🤖 {text.activeEngine}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" />
            <strong style={{ fontSize: 16, fontWeight: 700 }}>{text.engineStatus}</strong>
          </div>
          <span className="mod-monitor-sub">
            {autoHiddenCount > 0 ? `Đã tự động ngăn chặn ${autoHiddenCount} ca` : 'Lọc tự động theo luật & AI'}
          </span>
        </div>

        <div className="mod-monitor-card card-sla">
          <span className="mod-monitor-label">👥 {text.communityReports}</span>
          <strong className="mod-monitor-value" style={{ color: '#10B981' }}>
            {pendingStats.isPending ? '…' : reportsCount}
          </strong>
          <span className="mod-monitor-sub">{text.slaTarget}</span>
        </div>
      </section>

      {/* Header Hàng tab chính theo Mockup Screen 2 */}
      <div className="mod-header-row">
        <div className="mod-tabs-main">
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'queue' ? 'is-active' : ''}`}
            onClick={() => setTab('queue')}
          >
            Hàng đợi ({pendingTotal})
          </button>
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'investigating' ? 'is-active' : ''}`}
            onClick={() => setTab('investigating')}
          >
            Đang điều tra (48)
          </button>
          <button
            type="button"
            className={`mod-tab-btn ${tab === 'resolved' ? 'is-active' : ''}`}
            onClick={() => setTab('resolved')}
          >
            Đã xử lý
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

      {tab === 'log' ? (
        <ModerationLog />
      ) : tab === 'posts' ? (
        <PostModeration />
      ) : (
        <ModerationQueue statusTab={tab === 'resolved' ? 'resolved' : 'pending'} />
      )}
    </div>
  );
}

function ModerationQueue({ statusTab }: { statusTab: 'pending' | 'resolved' }) {
  const [filters, setFilters] = useState<AdminModerationControllerQueueParams>({ status: statusTab });
  const [subCategory, setSubCategory] = useState<'all' | 'video' | 'vlog' | 'post' | 'comment' | 'report'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDossierId, setActiveDossierId] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['moderation', 'queue', statusTab, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => moderationApi.queue({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: refreshInterval,
  });

  const rawItems = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Lọc theo subcategory và ô tìm kiếm
  const filteredItems = rawItems.filter((item) => {
    if (subCategory === 'video' && item.targetType !== 'post') return false;
    if (subCategory === 'comment' && item.targetType !== 'comment') return false;
    if (subCategory === 'post' && item.targetType !== 'post') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q) || item.targetId.toLowerCase().includes(q);
      const matchAuthor = (item.authorId ?? '').toLowerCase().includes(q);
      if (!matchId && !matchAuthor) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  return (
    <>
      {/* Thanh Bộ lọc & Tìm kiếm (Filter Bar) */}
      <div className="mod-filter-bar">
        <div className="mod-filter-group">
          <span className="mod-filter-label">Loại nội dung</span>
          <select
            className="mod-filter-select"
            value={filters.targetType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                targetType: (e.target.value as AdminModerationControllerQueueTargetType) || undefined,
              }))
            }
          >
            <option value="">Tất cả</option>
            <option value="post">Reel / Video / Bài viết</option>
            <option value="comment">Bình luận</option>
          </select>
        </div>

        <div className="mod-filter-group">
          <span className="mod-filter-label">Mức độ rủi ro</span>
          <select
            className="mod-filter-select"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'high') setFilters((f) => ({ ...f, reasonCode: undefined }));
            }}
          >
            <option value="">Tất cả</option>
            <option value="high">Rủi ro cao (≥80)</option>
            <option value="med">Rủi ro trung bình (50-79)</option>
            <option value="low">Rủi ro thấp (&lt;50)</option>
          </select>
        </div>

        <div className="mod-filter-group">
          <span className="mod-filter-label">Số báo cáo</span>
          <select className="mod-filter-select">
            <option value="">Tất cả</option>
            <option value="10">&gt; 10 báo cáo</option>
            <option value="5">&gt; 5 báo cáo</option>
            <option value="1">&gt; 0 báo cáo</option>
          </select>
        </div>

        <div className="mod-filter-group">
          <span className="mod-filter-label">Khoảng thời gian</span>
          <select className="mod-filter-select">
            <option value="7">7 ngày qua</option>
            <option value="1">Hôm nay</option>
            <option value="30">30 ngày qua</option>
          </select>
        </div>

        <div className="mod-filter-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="mod-filter-label">Tìm kiếm</span>
          <input
            type="text"
            className="mod-search-input"
            placeholder="🔍 Tìm theo tiêu đề, người đăng, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chia Layout: Subnav Menu bên trái + Bảng Danh sách bên phải */}
      <div className="mod-split-layout">
        {/* Subnav Trái */}
        <aside className="mod-subnav-card" aria-label="Phân loại nội dung kiểm duyệt">
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('all')}
          >
            <span>Tất cả nội dung</span>
            <span className="mod-subnav-count">312</span>
          </button>
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'video' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('video')}
          >
            <span>Reel / Video</span>
            <span className="mod-subnav-count">178</span>
          </button>
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'vlog' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('vlog')}
          >
            <span>Vlog</span>
            <span className="mod-subnav-count">46</span>
          </button>
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'post' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('post')}
          >
            <span>Bài viết</span>
            <span className="mod-subnav-count">48</span>
          </button>
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'comment' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('comment')}
          >
            <span>Bình luận</span>
            <span className="mod-subnav-count">24</span>
          </button>
          <button
            type="button"
            className={`mod-subnav-btn ${subCategory === 'report' ? 'is-active' : ''}`}
            onClick={() => setSubCategory('report')}
          >
            <span>Báo cáo vi phạm</span>
            <span className="mod-subnav-count">37</span>
          </button>
        </aside>

        {/* Khung Bảng Danh Sách */}
        <div className="mod-table-panel">
          {/* Thanh Thao Tác Hàng Loạt */}
          <div className="mod-bulk-toolbar">
            <div className="mod-bulk-left">
              <span style={{ fontWeight: 600, color: '#0F172A' }}>
                Đã chọn {selectedIds.length} nội dung
              </span>
              <button type="button" className="mod-bulk-btn hide" disabled={selectedIds.length === 0}>
                Ẩn (Tạm thời)
              </button>
              <button type="button" className="mod-bulk-btn restore" disabled={selectedIds.length === 0}>
                Khôi phục
              </button>
              <button type="button" className="mod-bulk-btn delete" disabled={selectedIds.length === 0}>
                Xóa
              </button>
              <button type="button" className="mod-bulk-btn reflag" disabled={selectedIds.length === 0}>
                Gắn cờ lại
              </button>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                Sắp xếp: <strong>Mức rủi ro giảm dần ▾</strong>
              </span>
            </div>
          </div>

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
                        checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <th>Nội dung</th>
                    <th>Thể loại</th>
                    <th>Số báo cáo</th>
                    <th>Điểm rủi ro</th>
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
                          <span className={getRiskBadgeClass(item.severity)}>
                            {item.severity}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="mod-btn-detail"
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#64748B' }}>
            <span>Hiển thị 1-{filteredItems.length} / 312</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" className="mod-mini-tab" disabled>‹</button>
              <button type="button" className="mod-mini-tab is-active">1</button>
              <button type="button" className="mod-mini-tab">2</button>
              <button type="button" className="mod-mini-tab">3</button>
              <span>...</span>
              <button type="button" className="mod-mini-tab">32</button>
              <button type="button" className="mod-mini-tab">›</button>
            </div>
            <span>10 / trang</span>
          </div>
        </div>
      </div>

      {/* Case Detail Modal (Screen 3 trong Mockup Image 2) */}
      {activeDossierId && (
        <CaseDetailModal
          id={activeDossierId}
          onClose={() => setActiveDossierId(null)}
        />
      )}
    </>
  );
}

/** Modal Chi Tiết Hồ Sơ Kiểm Duyệt (Screen 3 trong Image 2) */
function CaseDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
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
      if (!reasonCode) throw new Error(text.chooseReason);
      const body = { action, reasonCode, reasonDetail: notes.trim() || undefined };
      return detail.data?.status === 'resolved' && detail.data.targetType === 'comment'
        ? moderationApi.commentAction(detail.data.targetId, body)
        : moderationApi.decide(id, body);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
      onClose();
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
          <h2 id="mod-modal-heading" className="mod-modal-title">Chi tiết nội dung kiểm duyệt</h2>
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
                <h3 className="mod-post-title">
                  {item.target?.text || 'Không có nội dung văn bản'}
                </h3>
                <div className="mod-post-author-row">
                  <span>@{item.authorId ? item.authorId.slice(0, 8) : 'user_4587'}</span>
                  <span>•</span>
                  <span>Đăng 12/01/2025 14:20</span>
                  <span className="mod-type-tag">Reel</span>
                  <span className="mod-risk-tag-large">
                    ⚠️ RỦI RO: {item.severity} (Cao)
                  </span>
                </div>
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
                  <span className="mod-meta-label">Lý do gắn cờ</span>
                  <strong className="mod-meta-val" style={{ color: '#DC2626' }}>
                    Nội dung nhạy cảm, vi phạm cộng đồng
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
                  <div key={r.id} style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
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
          <button
            type="button"
            className="btn-decision investigate"
            disabled={decision.isPending}
            onClick={() => decision.mutate('dismiss')}
          >
            Đang điều tra
          </button>
          <button
            type="button"
            className="btn-decision hide"
            disabled={decision.isPending || !reasonCode}
            onClick={() => decision.mutate('hide')}
          >
            Ẩn (Tạm thời)
          </button>
          <button
            type="button"
            className="btn-decision restore"
            disabled={decision.isPending || !reasonCode}
            onClick={() => decision.mutate('restore')}
          >
            Khôi phục
          </button>
          <button
            type="button"
            className="btn-decision remove"
            disabled={decision.isPending || !reasonCode}
            onClick={() => decision.mutate('remove')}
          >
            Xóa
          </button>
        </div>
      </dialog>
    </div>
  );
}

function LogTable({ items }: { items: ModerationLogDto[] }) {
  if (!items.length) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{vi.api.empty}</p>;
  }

  return (
    <div className="admin-table-scroll">
      <table>
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
                <td>{date(action.createdAt)}</td>
                <td>{action.actorType === 'system' ? '🤖 Hệ thống' : action.moderatorId?.slice(0, 8)}</td>
                <td>
                  <span className={`log-action-badge action-${action.action}`}>
                    {actionLabel}
                  </span>
                </td>
                <td>
                  {text.reasons[action.reasonCode as keyof typeof text.reasons] ?? action.reasonCode}
                </td>
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
    <div className="mod-table-panel">
      <div style={{ padding: 18, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Nhật ký thao tác kiểm duyệt</h3>
        <span style={{ fontSize: 12, color: '#64748B' }}>Tổng cộng {rawItems.length} bản ghi</span>
      </div>
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
      {!query.isPending && <LogTable items={rawItems} />}
    </div>
  );
}
