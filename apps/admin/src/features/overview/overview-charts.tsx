'use client';
import { useState } from 'react';

/** Biểu đồ miền & đường Tăng trưởng người dùng (User Growth Area/Line Chart) */
export function UserGrowthChart() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dates = ['07/01', '08/01', '09/01', '10/01', '11/01', '12/01', '13/01'];
  // Active users: values normalized for height 160 (range 90k - 140k)
  const activeVals = [105, 110, 114, 118, 122, 126, 125.43];
  const newVals = [98, 101, 103, 106, 110, 114, 115.2];

  const minVal = 90;
  const maxVal = 140;
  const getY = (v: number) => 160 - ((v - minVal) / (maxVal - minVal)) * 140;
  const getX = (idx: number) => 50 + idx * 78;

  const activePoints = activeVals.map((v, i) => `${getX(i)},${getY(v)}`);
  const newPoints = newVals.map((v, i) => `${getX(i)},${getY(v)}`);

  // Path SVG
  const activeLine = `M ${activePoints.join(' L ')}`;
  const activeArea = `M 50,160 L ${activePoints.join(' L ')} L ${getX(6)},160 Z`;

  const newLine = `M ${newPoints.join(' L ')}`;
  const newArea = `M 50,160 L ${newPoints.join(' L ')} L ${getX(6)},160 Z`;

  return (
    <div className="overview-chart-container">
      <div className="overview-chart-header">
        <div>
          <h3 className="overview-card-title">
            <span className="chart-icon-box teal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            Tăng trưởng người dùng
          </h3>
          <div className="overview-chart-stat-row">
            <span className="overview-hero-val">125.430</span>
            <span className="trend-tag up">↑ +8,2%</span>
          </div>
        </div>
        <div className="chart-legend-row">
          <span className="legend-item">
            <span className="legend-dot teal" /> Người dùng mới
          </span>
          <span className="legend-item">
            <span className="legend-dot coral" /> Người dùng hoạt động
          </span>
        </div>
      </div>

      <div className="svg-chart-wrap" style={{ height: 180 }}>
        <svg viewBox="0 0 550 180" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF5A36" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Đường lưới ngang */}
          {[140, 130, 120, 110, 100, 90].map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line x1="45" y1={y} x2="535" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <text x="36" y={y + 3} fill="#94A3B8" fontSize="10" textAnchor="end" fontFamily="inherit">
                  {v}K
                </text>
              </g>
            );
          })}

          {/* Miền gradient */}
          <path d={newArea} fill="url(#newGrad)" />
          <path d={activeArea} fill="url(#activeGrad)" />

          {/* Đường vẽ */}
          <path d={newLine} fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
          <path d={activeLine} fill="none" stroke="#FF5A36" strokeWidth="2.5" strokeLinecap="round" />

          {/* Điểm nút & Trục hoành */}
          {dates.map((d, i) => {
            const x = getX(i);
            const yAct = getY(activeVals[i] ?? 100);
            const yNew = getY(newVals[i] ?? 100);
            const isHover = hoveredIdx === i;

            return (
              <g key={d} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <circle cx={x} cy={yNew} r={isHover ? 5 : 3.5} fill="#FFFFFF" stroke="#0D9488" strokeWidth="2" />
                <circle cx={x} cy={yAct} r={isHover ? 6 : 4} fill="#FF5A36" stroke="#FFFFFF" strokeWidth="2" />
                <text x={x} y="174" fill="#64748B" fontSize="11" textAnchor="middle" fontWeight={isHover ? '700' : '500'}>
                  {d}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Biểu đồ Tròn Phân bố Trạng thái Nội dung (Content Status Donut Chart) */
export function ContentStatusDonut() {
  // Bán kính r = 45, chu vi c = 2 * PI * 45 ≈ 282.74
  const c = 282.74;
  const gap = 3; // khoảng cách trắng thanh lịch giữa các lát cắt

  const pApproved = 78.4;
  const pPending = 12.6;
  const pRejected = 5.1;
  const pQuarantine = 3.9;

  const lenApproved = Math.max(0, (pApproved / 100) * c - gap);
  const lenPending = Math.max(0, (pPending / 100) * c - gap);
  const lenRejected = Math.max(0, (pRejected / 100) * c - gap);
  const lenQuarantine = Math.max(0, (pQuarantine / 100) * c - gap);

  const offApproved = 0;
  const offPending = -((pApproved / 100) * c);
  const offRejected = -(((pApproved + pPending) / 100) * c);
  const offQuarantine = -(((pApproved + pPending + pRejected) / 100) * c);

  return (
    <div className="overview-chart-container">
      <div className="overview-chart-header">
        <h3 className="overview-card-title">
          <span className="chart-icon-box green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
          Trạng thái nội dung
        </h3>
      </div>

      <div className="donut-layout-row">
        <div className="donut-svg-wrap">
          <svg viewBox="0 0 120 120" width="104" height="104">
            {/* Vòng nền mờ */}
            <circle cx="60" cy="60" r="45" fill="none" stroke="#F1F5F9" strokeWidth="13" />

            {/* Đã duyệt - Xanh lục (78,4%) */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#10B981"
              strokeWidth="13"
              strokeDasharray={`${lenApproved} ${c}`}
              strokeDashoffset={offApproved}
              transform="rotate(-90 60 60)"
            />
            {/* Chờ duyệt - Vàng cam (12,6%) */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="13"
              strokeDasharray={`${lenPending} ${c}`}
              strokeDashoffset={offPending}
              transform="rotate(-90 60 60)"
            />
            {/* Bị từ chối - Đỏ (5,1%) */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#EF4444"
              strokeWidth="13"
              strokeDasharray={`${lenRejected} ${c}`}
              strokeDashoffset={offRejected}
              transform="rotate(-90 60 60)"
            />
            {/* Cách ly - Xanh dương (3,9%) */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#0284C7"
              strokeWidth="13"
              strokeDasharray={`${lenQuarantine} ${c}`}
              strokeDashoffset={offQuarantine}
              transform="rotate(-90 60 60)"
            />

            {/* Tâm số liệu */}
            <text x="60" y="56" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0F172A">
              21.359
            </text>
            <text x="60" y="70" textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748B">
              Bài viết
            </text>
          </svg>
        </div>

        {/* Chú thích dữ liệu căn cột sạch sẽ */}
        <div className="donut-legend-list">
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#10B981' }} />
            <span className="donut-label">Đã duyệt</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">78,4%</strong>
              <span className="donut-count">(16.753)</span>
            </div>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#F59E0B' }} />
            <span className="donut-label">Chờ duyệt</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">12,6%</strong>
              <span className="donut-count">(2.692)</span>
            </div>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#EF4444' }} />
            <span className="donut-label">Bị từ chối</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">5,1%</strong>
              <span className="donut-count">(1.089)</span>
            </div>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#0284C7' }} />
            <span className="donut-label">Cách ly</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">3,9%</strong>
              <span className="donut-count">(825)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Biểu đồ Cột Lượt xem Nội dung (Content Views Bar Chart) */
export function ContentViewsBarChart() {
  const data = [
    { date: '07/01', views: 240 },
    { date: '08/01', views: 290 },
    { date: '09/01', views: 330 },
    { date: '10/01', views: 370 },
    { date: '11/01', views: 360 },
    { date: '12/01', views: 426.3, highlighted: true },
    { date: '13/01', views: 390 },
  ];

  const maxVal = 500;

  return (
    <div className="overview-chart-container">
      <div className="overview-chart-header">
        <div>
          <h3 className="overview-card-title">
            <span className="chart-icon-box teal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            Lượt xem nội dung
          </h3>
          <div className="overview-chart-stat-row">
            <span className="overview-hero-val">2,48M</span>
            <span className="trend-tag up">↑ +15,3%</span>
          </div>
        </div>
      </div>

      <div className="svg-chart-wrap" style={{ height: 160, position: 'relative' }}>
        <svg viewBox="0 0 380 150" width="100%" height="100%">
          {/* Trục hoành và đường lưới */}
          <line x1="20" y1="130" x2="360" y2="130" stroke="#E2E8F0" strokeWidth="1" />

          {/* Tooltip nổi chuẩn neo đúng trên đỉnh cột ngày 12/01 nằm hoàn toàn bên trong SVG canvas */}
          <g transform="translate(286, 20)">
            <rect x="-38" y="-18" width="76" height="24" rx="5" fill="#0F172A" />
            <polygon points="-4,6 4,6 0,10" fill="#0F172A" />
            <text x="0" y="-7" fill="#94A3B8" fontSize="8" fontWeight="600" textAnchor="middle">
              12/01
            </text>
            <text x="0" y="3" fill="#FFFFFF" fontSize="8.5" fontWeight="700" textAnchor="middle">
              426,3K lượt xem
            </text>
          </g>

          {data.map((item, i) => {
            const x = 32 + i * 48;
            const barHeight = (item.views / maxVal) * 110;
            const y = 130 - barHeight;

            return (
              <g key={item.date}>
                {/* Thanh cột */}
                <rect
                  x={x}
                  y={y}
                  width="28"
                  height={barHeight}
                  rx="6"
                  fill={item.highlighted ? '#14B8A6' : '#2DD4BF'}
                  opacity={item.highlighted ? 1 : 0.75}
                />
                {/* Ngày */}
                <text
                  x={x + 14}
                  y="144"
                  fill="#64748B"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight={item.highlighted ? '700' : '500'}
                >
                  {item.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Biểu đồ & Thống kê Đơn hàng & Thanh toán (Orders & Payments) */
export function OrdersPaymentsCard() {
  const c = 238.76; // 2 * PI * 38
  const gap = 2;

  const lenSuccess = Math.max(0, (96.4 / 100) * c - gap);
  const lenPending = Math.max(0, (2.3 / 100) * c - gap);
  const lenError = Math.max(0, (1.3 / 100) * c - gap);

  const offSuccess = 0;
  const offPending = -((96.4 / 100) * c);
  const offError = -(((96.4 + 2.3) / 100) * c);

  return (
    <div className="overview-chart-container">
      <div className="overview-chart-header">
        <h3 className="overview-card-title">
          <span className="chart-icon-box orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
          Đơn hàng & Thanh toán
        </h3>
      </div>

      <div className="orders-metrics-grid">
        <div>
          <span className="metric-tiny-sub">Tổng đơn hàng</span>
          <div className="metric-row">
            <strong className="overview-hero-val" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              8.742
            </strong>
            <span className="trend-tag up">↑ +12,6%</span>
          </div>
        </div>
        <div>
          <span className="metric-tiny-sub">Doanh thu (GMV)</span>
          <div className="metric-row">
            <strong className="overview-hero-val" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              24,68 tỷ đ
            </strong>
            <span className="trend-tag up">↑ +14,9%</span>
          </div>
        </div>
      </div>

      <div className="donut-layout-row" style={{ marginTop: 12 }}>
        <div className="donut-legend-list" style={{ flex: 1 }}>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#10B981' }} />
            <span className="donut-label">Thành công</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">8.428</strong>
              <span className="donut-count">96,4%</span>
            </div>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#0284C7' }} />
            <span className="donut-label">Chờ xác nhận</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">204</strong>
              <span className="donut-count">2,3%</span>
            </div>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot" style={{ background: '#EF4444' }} />
            <span className="donut-label">Lỗi / Bất thường</span>
            <div className="donut-val-pair">
              <strong className="donut-percent">110</strong>
              <span className="donut-count">1,3%</span>
            </div>
          </div>
        </div>

        <div className="donut-svg-wrap" style={{ width: 84, height: 84 }}>
          <svg viewBox="0 0 100 100" width="84" height="84">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="11" />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#10B981"
              strokeWidth="11"
              strokeDasharray={`${lenSuccess} ${c}`}
              strokeDashoffset={offSuccess}
              transform="rotate(-90 50 50)"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#0284C7"
              strokeWidth="11"
              strokeDasharray={`${lenPending} ${c}`}
              strokeDashoffset={offPending}
              transform="rotate(-90 50 50)"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#EF4444"
              strokeWidth="11"
              strokeDasharray={`${lenError} ${c}`}
              strokeDashoffset={offError}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="47" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">
              8.742
            </text>
            <text x="50" y="59" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#64748B">
              Đơn hàng
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
