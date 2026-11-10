'use client';
import { useState, useMemo } from 'react';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminUserDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError, useApiSession } from '@tripflix/api-client';
import { AdminApiError } from '../shell/api-state';

/** Tạo màu avatar ngẫu nhiên nhưng ổn định dựa trên ký tự đầu */
function getAvatarGradient(name: string) {
  const charCode = (name.charCodeAt(0) || 65) % 5;
  const gradients = [
    'linear-gradient(135deg, #FF5A36, #FF7A00)',
    'linear-gradient(135deg, #0D9488, #14B8A6)',
    'linear-gradient(135deg, #2563EB, #3B82F6)',
    'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    'linear-gradient(135deg, #D97706, #F59E0B)',
  ];
  return gradients[charCode] || gradients[0];
}

function getInitials(name: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || 'U';
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

export function StaffManagement() {
  const { user: currentUser } = useApiSession();
  const client = useQueryClient();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'moderator' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');

  // Modal tạo tài khoản
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Queries
  const users = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: async ({ signal }) => (await admin.adminControllerSearchUsers({ query, page }, { signal })).data,
  });

  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async ({ signal }) => (await admin.adminControllerListStaff({ signal })).data,
  });

  // Mutation cập nhật quyền / trạng thái
  const mutation = useMutation({
    mutationFn: async ({
      member,
      action,
    }: {
      member: AdminUserDto;
      action: 'lock' | 'unlock' | 'grant' | 'revoke';
    }) => {
      if (action === 'lock') return admin.adminControllerLock(member.id);
      if (action === 'unlock') return admin.adminControllerUnlock(member.id);
      if (action === 'grant') return admin.adminControllerGrantModerator({ userId: member.id });
      return admin.adminControllerRevokeModerator(member.id);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  // Tạo kiểm duyệt viên (TF056): không có mật khẩu, nhân sự nhận email để tự đặt mật khẩu.
  const createMutation = useMutation({
    mutationFn: (payload: { email: string; displayName: string }) =>
      admin.adminControllerCreateStaff({ ...payload, role: 'moderator' }),
    onSuccess: (_res, payload) => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      setCreateSuccess(
        `Đã tạo tài khoản cho ${payload.displayName}. Email đặt mật khẩu đã gửi tới ${payload.email}.`,
      );
      setNewDisplayName('');
      setNewEmail('');
      setCreateError(null);
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 4000);
    },
    onError: (err: unknown) => {
      // Lỗi 4xx của core-api có message tiếng Việt (ví dụ "Email đã tồn tại trong hệ thống").
      const message = err instanceof HttpError ? (err.body as { message?: unknown } | null)?.message : undefined;
      setCreateError(
        typeof message === 'string' && err instanceof HttpError && err.status < 500
          ? message
          : 'Không thể tạo tài khoản. Vui lòng thử lại.',
      );
    },
  });

  // Lọc dữ liệu hiển thị client-side kết hợp
  const items = users.data?.items ?? [];
  const filteredItems = useMemo(() => {
    return items.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    });
  }, [items, roleFilter, statusFilter]);

  // Thống kê số lượng
  const totalUsers = users.data?.total || items.length;
  const staffList = staff.data ?? [];
  const moderatorCount = staffList.filter((s) => s.role === 'moderator').length;
  const adminCount = staffList.filter((s) => s.role === 'superadmin').length;
  const activeCount = items.filter((u) => u.status === 'active').length;

  return (
    <div className="staff-workspace-container">
      {/* Header khu vực Phân quyền & Nhân sự */}
      <div className="staff-header-row">
        <div className="staff-title-block">
          <div className="staff-title-badge-row">
            <h1 className="staff-page-title">Phân quyền & Nhân sự</h1>
            <span className="staff-badge-primary">PRD v0.3</span>
          </div>
          <p className="staff-page-sub">
            Quản lý vai trò, quyền hạn, phân bổ nhân sự và cấp quyền kiểm duyệt toàn hệ thống
          </p>
        </div>

        <button
          type="button"
          className="staff-btn-create-modal"
          onClick={() => {
            setCreateError(null);
            setCreateSuccess(null);
            setShowCreateModal(true);
          }}
        >
          <span className="plus-icon">+</span> Tạo tài khoản nhân sự
        </button>
      </div>

      {/* 4 Thẻ KPI Chỉ số Nhân sự */}
      <div className="staff-kpi-grid">
        <div className="staff-kpi-card">
          <div className="staff-kpi-icon-circle blue">👥</div>
          <div className="staff-kpi-content">
            <span className="staff-kpi-label">Tổng tài khoản</span>
            <strong className="staff-kpi-val">{totalUsers}</strong>
            <span className="staff-kpi-sub">Người dùng hệ thống</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-icon-circle amber">🛡️</div>
          <div className="staff-kpi-content">
            <span className="staff-kpi-label">Kiểm duyệt viên</span>
            <strong className="staff-kpi-val">{moderatorCount || 1}</strong>
            <span className="staff-kpi-sub">Moderator hoạt động</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-icon-circle purple">👑</div>
          <div className="staff-kpi-content">
            <span className="staff-kpi-label">Quản trị viên</span>
            <strong className="staff-kpi-val">{adminCount || 1}</strong>
            <span className="staff-kpi-sub">Superadmin toàn quyền</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-icon-circle green">✅</div>
          <div className="staff-kpi-content">
            <span className="staff-kpi-label">Đang hoạt động</span>
            <strong className="staff-kpi-val">{activeCount}</strong>
            <span className="staff-kpi-sub">Tài khoản hợp lệ</span>
          </div>
        </div>
      </div>

      {/* Thanh Tabs chuyển đổi theo Screen 9 Mockup */}
      <div className="staff-tabs-bar">
        <button
          type="button"
          className={`staff-tab-pill ${activeTab === 'users' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-pill-icon">📋</span>
          Nhân sự & Người dùng
          <span className="staff-tab-count">{totalUsers}</span>
        </button>

        <button
          type="button"
          className={`staff-tab-pill ${activeTab === 'roles' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <span className="tab-pill-icon">🛡️</span>
          Vai trò & Ma trận phân quyền
          <span className="staff-tab-count">3</span>
        </button>
      </div>

      {/* Hiển thị lỗi API nếu có */}
      <AdminApiError error={users.error} retry={() => void users.refetch()} />
      <AdminApiError error={staff.error} retry={() => void staff.refetch()} />
      <AdminApiError error={mutation.error} />

      {/* NỘI DUNG TAB 1: DANH SÁCH NHÂN SỰ & NGƯỜI DÙNG */}
      {activeTab === 'users' && (
        <div className="staff-table-panel">
          {/* Thanh công cụ tìm kiếm và lọc */}
          <div className="staff-toolbar">
            <form
              className="staff-search-box"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(searchInput.trim());
                setPage(1);
              }}
            >
              <span className="staff-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm theo tên hiển thị, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="staff-search-input"
              />
              <button type="submit" className="staff-search-btn">
                Tìm kiếm
              </button>
            </form>

            <div className="staff-filters-right">
              {/* Lọc theo vai trò */}
              <select
                className="staff-select-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                aria-label="Lọc theo vai trò"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="superadmin">Quản trị viên (Admin)</option>
                <option value="moderator">Kiểm duyệt viên (Moderator)</option>
                <option value="member">Thành viên (Member)</option>
              </select>

              {/* Lọc theo trạng thái */}
              <select
                className="staff-select-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Lọc theo trạng thái"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã khóa</option>
              </select>

              <button
                type="button"
                className="staff-refresh-btn"
                title="Làm mới danh sách"
                onClick={() => {
                  void users.refetch();
                  void staff.refetch();
                }}
              >
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* Bảng dữ liệu người dùng & phân quyền */}
          <div className="staff-table-scroll">
            <table className="staff-data-table">
              <thead>
                <tr>
                  <th>Người dùng / Tên hiển thị</th>
                  <th>Email tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Cấp quyền & Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.isPending ? (
                  <tr>
                    <td colSpan={5} className="staff-td-empty">
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="staff-td-empty">
                      Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    const isSuperadmin = member.role === 'superadmin';
                    const isModerator = member.role === 'moderator';
                    const isLocked = member.status === 'locked';

                    return (
                      <tr key={member.id} className={isLocked ? 'is-locked-row' : ''}>
                        {/* Người dùng */}
                        <td>
                          <div className="staff-user-cell">
                            <div
                              className="staff-avatar-badge"
                              style={{ background: getAvatarGradient(member.displayName || member.email) }}
                            >
                              {getInitials(member.displayName || member.email)}
                            </div>
                            <div className="staff-user-meta">
                              <strong className="staff-user-name">{member.displayName || 'Chưa đặt tên'}</strong>
                              <span className="staff-user-id">#{member.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td>
                          <span className="staff-email-text">
                            <span style={{ marginRight: 6, opacity: 0.6 }}>✉️</span>
                            {member.email}
                          </span>
                        </td>

                        {/* Vai trò */}
                        <td>
                          {isSuperadmin ? (
                            <span className="role-pill superadmin">
                              👑 Quản trị viên
                            </span>
                          ) : isModerator ? (
                            <span className="role-pill moderator">
                              🛡️ Kiểm duyệt viên
                            </span>
                          ) : (
                            <span className="role-pill member">
                              👤 Thành viên
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td>
                          {isLocked ? (
                            <span className="status-pill locked">● Đã khóa</span>
                          ) : (
                            <span className="status-pill active">● Hoạt động</span>
                          )}
                        </td>

                        {/* Cụm nút Thao tác & Phân quyền */}
                        <td>
                          <div className="staff-actions-row">
                            {isSelf ? (
                              <span className="staff-action-note">(Tài khoản hiện tại)</span>
                            ) : isSuperadmin ? (
                              <span className="staff-action-note">Superadmin</span>
                            ) : (
                              <>
                                {/* Nút cấp hoặc thu hồi quyền Moderator */}
                                {isModerator ? (
                                  <button
                                    type="button"
                                    className="staff-btn-action revoke"
                                    disabled={mutation.isPending}
                                    title="Thu hồi quyền kiểm duyệt, hạ về thành viên"
                                    onClick={() => mutation.mutate({ member, action: 'revoke' })}
                                  >
                                    ↩️ Thu hồi kiểm duyệt
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="staff-btn-action grant"
                                    disabled={mutation.isPending || isLocked}
                                    title="Cấp quyền kiểm duyệt viên (Moderator) cho người dùng này"
                                    onClick={() => mutation.mutate({ member, action: 'grant' })}
                                  >
                                    🛡️ Cấp quyền kiểm duyệt
                                  </button>
                                )}

                                {/* Nút khóa / mở khóa tài khoản */}
                                {isLocked ? (
                                  <button
                                    type="button"
                                    className="staff-btn-action unlock"
                                    disabled={mutation.isPending}
                                    title="Mở khóa tài khoản người dùng"
                                    onClick={() => mutation.mutate({ member, action: 'unlock' })}
                                  >
                                    🔓 Mở khóa
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="staff-btn-action lock"
                                    disabled={mutation.isPending}
                                    title="Khóa tài khoản và đăng xuất mọi phiên ngay lập tức"
                                    onClick={() => mutation.mutate({ member, action: 'lock' })}
                                  >
                                    🔒 Khóa
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="staff-pagination-bar">
            <span className="staff-page-info">
              Hiển thị <strong>{filteredItems.length}</strong> trên tổng số <strong>{totalUsers}</strong> tài khoản
            </span>
            <div className="staff-page-buttons">
              <button
                type="button"
                className="staff-page-nav-btn"
                disabled={page <= 1 || users.isFetching}
                onClick={() => setPage(page - 1)}
              >
                ‹ Trang trước
              </button>
              <span className="staff-page-current">Trang {page}</span>
              <button
                type="button"
                className="staff-page-nav-btn"
                disabled={filteredItems.length < 20 || users.isFetching}
                onClick={() => setPage(page + 1)}
              >
                Trang sau ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB 2: VAI TRÒ & MA TRẬN PHÂN QUYỀN (CHUẨN SCREEN 9 MOCKUP) */}
      {activeTab === 'roles' && (
        <div className="staff-roles-panel">
          <div className="staff-roles-grid">
            {/* Card 1: Member */}
            <div className="staff-role-card">
              <div className="role-card-header">
                <div className="role-card-title-wrap">
                  <div className="role-icon-box member">👤</div>
                  <div>
                    <h3 className="role-card-name">Member</h3>
                    <span className="role-card-badge-type">Hệ thống</span>
                  </div>
                </div>
                <span className="role-level-tag">Cấp 1</span>
              </div>
              <p className="role-card-desc">Thành viên thông thường trải nghiệm mạng xã hội và dịch vụ du lịch.</p>

              <div className="role-permissions-section">
                <span className="perm-section-title">Quyền hạn được phép:</span>
                <ul className="perm-list">
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Xem và đăng tải bài viết, video, vlog du lịch
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Tương tác cộng đồng (thích, bình luận, chia sẻ)
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Tìm kiếm, đặt chuyến đi, phòng khách sạn và vé máy bay
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Quản lý hồ sơ cá nhân và lịch sử đơn hàng
                  </li>
                </ul>
              </div>

              <div className="role-restrictions-section">
                <span className="perm-section-title">Giới hạn:</span>
                <ul className="perm-list">
                  <li className="perm-item denied">
                    <span className="perm-cross">✕</span> Không có quyền truy cập trang quản trị Back Office
                  </li>
                  <li className="perm-item denied">
                    <span className="perm-cross">✕</span> Không xem được dữ liệu kiểm duyệt hoặc người dùng khác
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Moderator */}
            <div className="staff-role-card highlight-mod">
              <div className="role-card-header">
                <div className="role-card-title-wrap">
                  <div className="role-icon-box moderator">🛡️</div>
                  <div>
                    <h3 className="role-card-name">Moderator</h3>
                    <span className="role-card-badge-type active">Kiểm duyệt nội dung</span>
                  </div>
                </div>
                <span className="role-level-tag mod">Cấp 2</span>
              </div>
              <p className="role-card-desc">Kiểm duyệt viên chuyên trách an toàn nội dung và xử lý báo cáo vi phạm.</p>

              <div className="role-permissions-section">
                <span className="perm-section-title">Quyền hạn được phép:</span>
                <ul className="perm-list">
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Truy cập Trung tâm vận hành & Hàng đợi kiểm duyệt (Queue)
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Duyệt, Tạm ẩn, Khôi phục và Xóa bài viết / bình luận
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Tiếp nhận và xử lý báo cáo vi phạm tiêu chuẩn cộng đồng
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Theo dõi cảnh báo tương tác bất thường & rủi ro nội dung
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Xem nhật ký kiểm toán (Audit Log) các tác vụ kiểm duyệt
                  </li>
                </ul>
              </div>

              <div className="role-restrictions-section">
                <span className="perm-section-title">Giới hạn theo PRD:</span>
                <ul className="perm-list">
                  <li className="perm-item denied">
                    <span className="perm-cross">✕</span> Không xem dữ liệu thanh toán & doanh thu đơn hàng (GMV)
                  </li>
                  <li className="perm-item denied">
                    <span className="perm-cross">✕</span> Không có quyền phân quyền hoặc quản lý tài khoản nhân sự
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Admin / Superadmin */}
            <div className="staff-role-card highlight-admin">
              <div className="role-card-header">
                <div className="role-card-title-wrap">
                  <div className="role-icon-box admin">👑</div>
                  <div>
                    <h3 className="role-card-name">Admin (Superadmin)</h3>
                    <span className="role-card-badge-type super">Toàn quyền hệ thống</span>
                  </div>
                </div>
                <span className="role-level-tag admin">Cấp 3</span>
              </div>
              <p className="role-card-desc">Quản trị viên cấp cao có toàn quyền quản lý hệ thống, doanh thu và nhân sự.</p>

              <div className="role-permissions-section">
                <span className="perm-section-title">Quyền hạn được phép:</span>
                <ul className="perm-list">
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Toàn quyền kiểm duyệt nội dung và xem toàn bộ nhật ký kiểm toán
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Quản trị đơn hàng, đối soát thanh toán & mở lịch trống giá
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Cấp quyền, thu hồi quyền kiểm duyệt viên & khóa/mở khóa tài khoản
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Tạo tài khoản nhân sự mới và phân bổ vai trò trực tiếp
                  </li>
                  <li className="perm-item allowed">
                    <span className="perm-check">✔</span> Xem toàn bộ báo cáo doanh thu, cảnh báo hệ thống & số liệu
                  </li>
                </ul>
              </div>

              <div className="role-restrictions-section">
                <span className="perm-section-title">Giới hạn:</span>
                <p style={{ margin: 0, fontSize: 11.5, color: '#16A34A', fontWeight: 600 }}>
                  Không có giới hạn nào. Tài khoản có quyền tối cao trên toàn hệ thống.
                </p>
              </div>
            </div>
          </div>

          {/* Banner giải thích phân quyền theo PRD */}
          <div className="staff-prd-banner">
            <span className="staff-prd-icon">💡</span>
            <div className="staff-prd-text">
              <strong>Phân quyền theo PRD v0.3:</strong> Hệ thống Tripflix hiện hỗ trợ 3 vai trò cố định: Member, Moderator và Admin (Superadmin). Moderator chỉ được phép thao tác kiểm duyệt nội dung, xử lý báo cáo và bị giới hạn quyền xem thanh toán và quản lý nhân sự.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẠO TÀI KHOẢN NHÂN SỰ MỚI (CHỨC NĂNG DÀNH CHO ADMIN) */}
      {showCreateModal && (
        <div className="mod-modal-overlay">
          <button
            type="button"
            className="mod-modal-backdrop-btn"
            onClick={() => setShowCreateModal(false)}
            aria-label="Đóng nền modal"
          />

          <dialog open className="mod-modal-dialog staff-create-dialog" aria-labelledby="create-modal-title">
            <div className="mod-modal-header">
              <div>
                <h2 id="create-modal-title" className="mod-modal-title">
                  Tạo tài khoản nhân sự mới ✨
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
                  Khởi tạo tài khoản và phân quyền kiểm duyệt viên hoặc quản trị viên
                </p>
              </div>
              <button
                type="button"
                className="mod-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCreateError(null);
                setCreateSuccess(null);
                if (!newDisplayName.trim()) {
                  setCreateError('Vui lòng nhập họ tên nhân sự.');
                  return;
                }
                if (!newEmail.trim() || !newEmail.includes('@')) {
                  setCreateError('Vui lòng nhập email hợp lệ.');
                  return;
                }
                createMutation.mutate({
                  displayName: newDisplayName.trim(),
                  email: newEmail.trim(),
                });
              }}
            >
              <div className="mod-modal-body" style={{ gap: 14 }}>
                {createError && (
                  <div className="admin-error" style={{ marginBottom: 4 }}>
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div
                    style={{
                      background: '#DCFCE7',
                      color: '#16A34A',
                      padding: 10,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ✓ {createSuccess}
                  </div>
                )}

                <div className="staff-form-group">
                  <label className="staff-form-label" htmlFor="new-staff-name">
                    Họ và tên / Tên hiển thị <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="new-staff-name"
                    type="text"
                    required
                    placeholder="VD: Nguyễn Thu Trang"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="staff-form-input"
                  />
                </div>

                <div className="staff-form-group">
                  <label className="staff-form-label" htmlFor="new-staff-email">
                    Email công việc <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="new-staff-email"
                    type="email"
                    required
                    placeholder="VD: mod_trang@tripflix.vn"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="staff-form-input"
                  />
                </div>

                <div className="staff-form-group">
                  <span className="staff-form-label">Vai trò</span>
                  <div className="staff-radio-card is-selected" id="new-staff-role">
                    <div className="staff-radio-content">
                      <strong>🛡️ Kiểm duyệt viên (Moderator)</strong>
                      <span>Chuyên trách duyệt bài, ẩn bài vi phạm và xử lý báo cáo</span>
                    </div>
                  </div>
                </div>

                <p id="new-staff-password-hint" style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  Nhân sự sẽ nhận email để tự đặt mật khẩu. Link có hiệu lực 30 phút; hết hạn thì dùng
                  &quot;Quên mật khẩu&quot; ở trang đăng nhập.
                </p>
              </div>

              <div className="mod-modal-footer">
                <button
                  type="button"
                  className="btn-decision close"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-decision restore"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Đang tạo...' : '✓ Xác nhận tạo tài khoản'}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
