'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  UserGrowthChart,
  ContentStatusDonut,
  ContentViewsBarChart,
  OrdersPaymentsCard,
} from './overview-charts';

export function AdminOverview() {
  const [modFilter, setModFilter] = useState<'all' | 'post' | 'video' | 'comment'>('all');

  return (
    <div className="overview-root">
      {/* Hàng 1: 5 Thẻ Chỉ số KPI Vận hành Nền tảng */}
      <section className="overview-kpi-grid" aria-label="Các chỉ số chính">
        {/* KPI 1: Người dùng hoạt động */}
        <div className="overview-kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-circle cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="kpi-data-block">
              <span className="kpi-label">Người dùng hoạt động</span>
              <strong className="kpi-value">125.430</strong>
              <span className="trend-tag up">
                ↑ +8,2% <span className="trend-sub">so với 7 ngày trước</span>
              </span>
            </div>
          </div>
          {/* Họa tiết trang trí góc mờ */}
          <div className="kpi-bg-accent cyan" />
        </div>

        {/* KPI 2: Chuyến đi (Booking) */}
        <div className="overview-kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-circle amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2">
                <rect width="20" height="14" x="2" y="7" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="kpi-data-block">
              <span className="kpi-label">Chuyến đi (Booking)</span>
              <strong className="kpi-value">8.742</strong>
              <span className="trend-tag up">
                ↑ +12,6% <span className="trend-sub">so với 7 ngày trước</span>
              </span>
            </div>
          </div>
          <div className="kpi-bg-accent amber" />
        </div>

        {/* KPI 3: Nội dung đăng tải */}
        <div className="overview-kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-circle blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="kpi-data-block">
              <span className="kpi-label">Nội dung đăng tải</span>
              <strong className="kpi-value">21.359</strong>
              <span className="trend-tag up">
                ↑ +9,4% <span className="trend-sub">so với 7 ngày trước</span>
              </span>
            </div>
          </div>
          <div className="kpi-bg-accent blue" />
        </div>

        {/* KPI 4: Lượt xem */}
        <div className="overview-kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-circle emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="kpi-data-block">
              <span className="kpi-label">Lượt xem</span>
              <strong className="kpi-value">2,48M</strong>
              <span className="trend-tag up">
                ↑ +15,3%
              </span>
            </div>
          </div>
          <div className="kpi-bg-accent emerald" />
        </div>

        {/* KPI 5: Lượt yêu thích */}
        <div className="overview-kpi-card">
          <div className="kpi-card-inner">
            <div className="kpi-icon-circle rose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <div className="kpi-data-block">
              <span className="kpi-label">Lượt yêu thích</span>
              <strong className="kpi-value">436.921</strong>
              <span className="trend-tag up">
                ↑ +11,8%
              </span>
            </div>
          </div>
          <div className="kpi-bg-accent rose" />
        </div>
      </section>

      {/* Hàng 2: Tăng trưởng người dùng + Trạng thái nội dung + Cảnh báo hệ thống */}
      <section className="overview-row-dashboard-2">
        {/* Cột 1: Tăng trưởng người dùng (Area Line Chart) */}
        <div className="overview-card-panel">
          <UserGrowthChart />
        </div>

        {/* Cột 2: Trạng thái nội dung (Donut Chart) */}
        <div className="overview-card-panel">
          <ContentStatusDonut />
        </div>

        {/* Cột 3: Cảnh báo hệ thống (Live Alerts Feed) */}
        <div className="overview-card-panel">
          <div className="overview-chart-header">
            <h3 className="overview-card-title">
              <span className="chart-icon-box red">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </span>
              Cảnh báo hệ thống
            </h3>
            <span className="badge-alert-count">12</span>
          </div>

          <div className="alerts-feed-list">
            <div className="alert-feed-item">
              <div className="alert-feed-icon warning">⚠️</div>
              <div className="alert-feed-content">
                <strong className="alert-feed-title">Thanh toán thành công, chưa xác nhận đặt chỗ</strong>
                <span className="alert-feed-meta">BK-2841 • Đã quá 30 phút</span>
              </div>
              <span className="alert-feed-time">10:24</span>
            </div>

            <div className="alert-feed-item">
              <div className="alert-feed-icon warning">⚠️</div>
              <div className="alert-feed-content">
                <strong className="alert-feed-title">Nghi vấn giao dịch bị tính phí hai lần</strong>
                <span className="alert-feed-meta">BK-2838 • Cần đối soát</span>
              </div>
              <span className="alert-feed-time">10:12</span>
            </div>

            <div className="alert-feed-item">
              <div className="alert-feed-icon warning">⚠️</div>
              <div className="alert-feed-content">
                <strong className="alert-feed-title">Bài đăng tăng tương tác bất thường</strong>
                <span className="alert-feed-meta">RL-8201 • Nghi vấn seeding</span>
              </div>
              <span className="alert-feed-time">09:48</span>
            </div>

            <div className="alert-feed-item">
              <div className="alert-feed-icon info">ℹ️</div>
              <div className="alert-feed-content">
                <strong className="alert-feed-title">API phản hồi chậm</strong>
                <span className="alert-feed-meta">Thời gian trung bình 2,8s (ngưỡng: 1,5s)</span>
              </div>
              <span className="alert-feed-time">09:30</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hàng 3: Lượt xem nội dung + Đơn hàng & Thanh toán + Top điểm đến */}
      <section className="overview-row-equal-3">
        {/* Cột 1: Lượt xem nội dung (Bar Chart) */}
        <div className="overview-card-panel">
          <ContentViewsBarChart />
        </div>

        {/* Cột 2: Đơn hàng & Thanh toán (Mini Donut & Metrics) */}
        <div className="overview-card-panel">
          <OrdersPaymentsCard />
        </div>

        {/* Cột 3: Top điểm đến (theo lượt xem) */}
        <div className="overview-card-panel">
          <div className="overview-chart-header" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <h3 className="overview-card-title" style={{ fontSize: 13, whiteSpace: 'nowrap', minWidth: 0 }}>
              <span className="chart-icon-box coral">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span>Top điểm đến</span>
              <span className="card-sub-hint" style={{ fontSize: 10 }}>(lượt xem)</span>
            </h3>
            <Link href="/analytics" className="card-header-link" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Xem tất cả →
            </Link>
          </div>

          <div className="destinations-list">
            <div className="destination-item">
              <span className="dest-rank gold">👑 1</span>
              <div className="dest-thumb dalat" />
              <div className="dest-info">
                <strong className="dest-name">Đà Lạt</strong>
                <span className="dest-views">326,4K</span>
              </div>
              <span className="trend-tag up">↑ +18,2%</span>
            </div>

            <div className="destination-item">
              <span className="dest-rank silver">🥈 2</span>
              <div className="dest-thumb danang" />
              <div className="dest-info">
                <strong className="dest-name">Đà Nẵng</strong>
                <span className="dest-views">287,9K</span>
              </div>
              <span className="trend-tag up">↑ +12,5%</span>
            </div>

            <div className="destination-item">
              <span className="dest-rank bronze">🥉 3</span>
              <div className="dest-thumb nhatrang" />
              <div className="dest-info">
                <strong className="dest-name">Nha Trang</strong>
                <span className="dest-views">219,7K</span>
              </div>
              <span className="trend-tag up">↑ +11,9%</span>
            </div>

            <div className="destination-item">
              <span className="dest-rank">4</span>
              <div className="dest-thumb sapa" />
              <div className="dest-info">
                <strong className="dest-name">Sapa</strong>
                <span className="dest-views">181,2K</span>
              </div>
              <span className="trend-tag up">↑ +9,6%</span>
            </div>

            <div className="destination-item">
              <span className="dest-rank">5</span>
              <div className="dest-thumb phuquoc" />
              <div className="dest-info">
                <strong className="dest-name">Phú Quốc</strong>
                <span className="dest-views">176,8K</span>
              </div>
              <span className="trend-tag up">↑ +8,9%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hàng 4: Hàng đợi kiểm duyệt + Hoạt động gần đây + Nhật ký kiểm toán */}
      <section className="overview-row-equal-3">
        {/* Cột 1: Hàng đợi kiểm duyệt (Cards) */}
        <div className="overview-card-panel">
          <div className="overview-chart-header" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <h3 className="overview-card-title" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                <span className="chart-icon-box orange">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Hàng đợi kiểm duyệt</span>
              </h3>
              <span className="badge-alert-count">312</span>
            </div>
            <Link href="/moderation" className="card-header-link" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Xem tất cả →
            </Link>
          </div>

          {/* Tab filter nhỏ */}
          <div className="mod-mini-tabs">
            <button
              type="button"
              className={`mod-mini-tab ${modFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setModFilter('all')}
            >
              Tất cả (312)
            </button>
            <button
              type="button"
              className={`mod-mini-tab ${modFilter === 'post' ? 'is-active' : ''}`}
              onClick={() => setModFilter('post')}
            >
              Bài viết (178)
            </button>
            <button
              type="button"
              className={`mod-mini-tab ${modFilter === 'video' ? 'is-active' : ''}`}
              onClick={() => setModFilter('video')}
            >
              Video (86)
            </button>
            <button
              type="button"
              className={`mod-mini-tab ${modFilter === 'comment' ? 'is-active' : ''}`}
              onClick={() => setModFilter('comment')}
            >
              Bình luận (48)
            </button>
          </div>

          {/* Danh sách thẻ kiểm duyệt */}
          <div className="mod-cards-stack">
            {/* Thẻ 1 */}
            <div className="mod-queue-card">
              <div className="mod-card-thumb-wrap">
                <div className="mod-card-thumb hagiang" />
                <span className="mod-card-duration">02:34</span>
              </div>
              <div className="mod-card-body">
                <strong className="mod-card-title">Khám phá Hà Giang mùa hoa tam giác mạch</strong>
                <span className="mod-card-author">@travelwithminh • 2 giờ trước</span>
                <div className="mod-card-badges">
                  <span className="risk-pill danger">Rủi ro cao</span>
                  <span className="report-count-tag">Báo cáo: 12</span>
                </div>
              </div>
              <div className="mod-card-actions">
                <Link href="/moderation" className="btn-action-view">
                  👁️ Xem
                </Link>
                <button type="button" className="btn-action-approve">
                  ✓ Duyệt
                </button>
              </div>
            </div>

            {/* Thẻ 2 */}
            <div className="mod-queue-card">
              <div className="mod-card-thumb-wrap">
                <div className="mod-card-thumb phuquoc" />
                <span className="mod-card-duration">01:18</span>
              </div>
              <div className="mod-card-body">
                <strong className="mod-card-title">Review resort Phú Quốc 5 sao</strong>
                <span className="mod-card-author">@linhtravels • 3 giờ trước</span>
                <div className="mod-card-badges">
                  <span className="risk-pill warning">Rủi ro trung bình</span>
                  <span className="report-count-tag">Báo cáo: 4</span>
                </div>
              </div>
              <div className="mod-card-actions">
                <Link href="/moderation" className="btn-action-view">
                  👁️ Xem
                </Link>
                <button type="button" className="btn-action-approve">
                  ✓ Duyệt
                </button>
              </div>
            </div>

            {/* Thẻ 3 */}
            <div className="mod-queue-card">
              <div className="mod-card-thumb-wrap">
                <div className="mod-card-thumb taxua" />
              </div>
              <div className="mod-card-body">
                <strong className="mod-card-title">Cắm trại ở Tà Xùa – Trải nghiệm đáng nhớ</strong>
                <span className="mod-card-author">@outdoor_tuan • 4 giờ trước</span>
                <div className="mod-card-badges">
                  <span className="risk-pill warning">Rủi ro trung bình</span>
                  <span className="report-count-tag">Báo cáo: 3</span>
                </div>
              </div>
              <div className="mod-card-actions">
                <Link href="/moderation" className="btn-action-view">
                  👁️ Xem
                </Link>
                <button type="button" className="btn-action-approve">
                  ✓ Duyệt
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Hoạt động gần đây (Timeline) */}
        <div className="overview-card-panel">
          <div className="overview-chart-header" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <h3 className="overview-card-title" style={{ fontSize: 13, whiteSpace: 'nowrap', minWidth: 0 }}>
              <span className="chart-icon-box rose">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </span>
              <span>Hoạt động gần đây</span>
            </h3>
            <Link href="/moderation" className="card-header-link" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Xem tất cả →
            </Link>
          </div>

          <div className="activity-timeline-list">
            <div className="activity-timeline-item">
              <div className="timeline-dot green" />
              <div className="timeline-info">
                <span className="timeline-text">
                  <strong>Admin</strong> duyệt bài viết <code>#RL-8192</code>
                </span>
                <span className="timeline-time">10:42</span>
              </div>
            </div>

            <div className="activity-timeline-item">
              <div className="timeline-dot amber" />
              <div className="timeline-info">
                <span className="timeline-text">
                  <strong>user_4587</strong> gửi báo cáo nội dung
                </span>
                <span className="timeline-time">10:30</span>
              </div>
            </div>

            <div className="activity-timeline-item">
              <div className="timeline-dot red" />
              <div className="timeline-info">
                <span className="timeline-text">
                  <strong>Hệ thống</strong> phát hiện tương tác bất thường
                </span>
                <span className="timeline-time">10:12</span>
              </div>
            </div>

            <div className="activity-timeline-item">
              <div className="timeline-dot green" />
              <div className="timeline-info">
                <span className="timeline-text">
                  Xác nhận đơn hàng <code>BK-2840</code>
                </span>
                <span className="timeline-time">09:58</span>
              </div>
            </div>

            <div className="activity-timeline-item">
              <div className="timeline-dot blue" />
              <div className="timeline-info">
                <span className="timeline-text">
                  Cập nhật chính sách cộng đồng (v1.3)
                </span>
                <span className="timeline-time">09:41</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 3: Nhật ký kiểm toán (Audit Log Table) */}
        <div className="overview-card-panel">
          <div className="overview-chart-header" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <h3 className="overview-card-title" style={{ fontSize: 13, whiteSpace: 'nowrap', minWidth: 0 }}>
              <span className="chart-icon-box orange">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <span>Nhật ký kiểm toán</span>
            </h3>
            <Link href="/moderation" className="card-header-link" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Xem tất cả →
            </Link>
          </div>

          <div className="audit-preview-table-wrap">
            <table className="audit-preview-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10:42:18</td>
                  <td><span className="audit-actor">mod_012</span></td>
                  <td><span className="audit-action orange">Tạm ẩn bài đăng</span></td>
                  <td><code>#RL-8192</code></td>
                </tr>
                <tr>
                  <td>10:30:04</td>
                  <td><span className="audit-actor admin">admin_001</span></td>
                  <td><span className="audit-action green">Khôi phục bài đăng</span></td>
                  <td><code>#RL-8167</code></td>
                </tr>
                <tr>
                  <td>10:12:31</td>
                  <td><span className="audit-actor">mod_008</span></td>
                  <td><span className="audit-action red">Xóa bình luận</span></td>
                  <td><code>#CM-2038</code></td>
                </tr>
                <tr>
                  <td>09:58:10</td>
                  <td><span className="audit-actor admin">admin_001</span></td>
                  <td><span className="audit-action red">Khóa tài khoản</span></td>
                  <td><code>#USR-028</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
