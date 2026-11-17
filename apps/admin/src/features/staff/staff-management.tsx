'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError, useApiSession } from '@tripflix/api-client';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminUserDto } from '@tripflix/api-client/core-api/model/index';
import { cn } from '@tripflix/ui-web';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { formatNumber, shortId } from '../ui/format';
import { Icon } from '../ui/icon';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Drawer,
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
  type Tone,
} from '../ui/primitives';

type MemberAction = 'lock' | 'unlock' | 'grant' | 'revoke';
type RoleFilter = 'all' | 'superadmin' | 'moderator' | 'member';
type StatusFilter = 'all' | 'active' | 'locked';

const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  superadmin: { label: 'Quản trị viên', tone: 'navy' },
  moderator: { label: 'Kiểm duyệt viên', tone: 'teal' },
  member: { label: 'Thành viên', tone: 'neutral' },
};

const CONFIRM: Record<MemberAction, (name: string) => string | null> = {
  lock: (name) => `Khoá tài khoản ${name}? Mọi phiên đăng nhập của người này sẽ bị đăng xuất ngay.`,
  revoke: (name) => `Thu hồi quyền kiểm duyệt của ${name}? Người này sẽ bị đăng xuất khỏi trang quản trị.`,
  unlock: () => null,
  grant: () => null,
};

/** Ma trận quyền theo PRD: ba vai trò cố định. */
const PERMISSIONS: readonly { label: string; member: boolean; moderator: boolean; superadmin: boolean }[] = [
  { label: 'Đăng bài, tương tác cộng đồng, đặt chuyến đi', member: true, moderator: true, superadmin: true },
  { label: 'Truy cập trung tâm vận hành và hàng chờ kiểm duyệt', member: false, moderator: true, superadmin: true },
  { label: 'Ẩn, khôi phục, gỡ bài viết và bình luận', member: false, moderator: true, superadmin: true },
  { label: 'Xử lý báo cáo, khiếu nại và scan cần phục hồi', member: false, moderator: true, superadmin: true },
  { label: 'Xem nhật ký kiểm toán và cảnh báo vận hành', member: false, moderator: true, superadmin: true },
  { label: 'Theo dõi tìm kiếm và job định kỳ', member: false, moderator: true, superadmin: true },
  { label: 'Chạy ngay hoặc đổi chu kỳ job', member: false, moderator: false, superadmin: true },
  { label: 'Lịch trống, giá, đơn hàng và thanh toán', member: false, moderator: false, superadmin: true },
  { label: 'Tạo nhân sự, cấp hoặc thu hồi quyền, khoá tài khoản', member: false, moderator: false, superadmin: true },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || 'U';
  return ((parts[0]?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase();
}

export function StaffManagement() {
  const { user: currentUser } = useApiSession();
  const client = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const users = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: async ({ signal }) => (await admin.adminControllerSearchUsers({ query, page }, { signal })).data,
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async ({ signal }) => (await admin.adminControllerListStaff({ signal })).data,
  });
  const mutation = useMutation({
    mutationFn: async ({ member, action }: { member: AdminUserDto; action: MemberAction }) => {
      if (action === 'lock') return admin.adminControllerLock(member.id);
      if (action === 'unlock') return admin.adminControllerUnlock(member.id);
      if (action === 'grant') return admin.adminControllerGrantModerator({ userId: member.id });
      return admin.adminControllerRevokeModerator(member.id);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin'] }),
  });
  const runAction = (member: AdminUserDto, action: MemberAction) => {
    const message = CONFIRM[action](member.displayName || member.email);
    if (message && !window.confirm(message)) return;
    mutation.mutate({ member, action });
  };

  const items = users.data?.items ?? [];
  const filteredItems = items.filter(
    (member) =>
      (roleFilter === 'all' || member.role === roleFilter) && (statusFilter === 'all' || member.status === statusFilter),
  );
  const staffList = staff.data ?? [];
  const pageSize = users.data?.pageSize ?? 20;
  const total = users.data?.total;
  const hasNextPage = total !== undefined && page * pageSize < total;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Phân quyền & Nhân sự"
        subtitle="Quản lý vai trò, quyền hạn và tài khoản kiểm duyệt toàn hệ thống."
        actions={
          <Button variant="primary" icon="users" onClick={() => setIsCreateOpen(true)}>
            Tạo tài khoản nhân sự
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chỉ số nhân sự">
        <StatTile
          label="Tổng tài khoản"
          icon="users"
          tone="navy"
          isLoading={users.isPending}
          value={total === undefined ? '—' : formatNumber(total)}
          sub={query ? `Khớp "${query}"` : 'Người dùng hệ thống'}
        />
        <StatTile
          label="Kiểm duyệt viên"
          icon="shield"
          tone="teal"
          isLoading={staff.isPending}
          value={formatNumber(staffList.filter((member) => member.role === 'moderator').length)}
          sub="Moderator đang có quyền"
        />
        <StatTile
          label="Quản trị viên"
          icon="spark"
          tone="sun"
          isLoading={staff.isPending}
          value={formatNumber(staffList.filter((member) => member.role === 'superadmin').length)}
          sub="Superadmin toàn quyền"
        />
        <StatTile
          label="Bị khoá trong trang này"
          icon="alert"
          tone="coral"
          isLoading={users.isPending}
          value={formatNumber(items.filter((member) => member.status === 'locked').length)}
          sub={`Trang ${page} · ${items.length} tài khoản`}
        />
      </section>

      <Segmented
        ariaLabel="Khu vực nhân sự"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'users', label: 'Nhân sự & Người dùng' },
          { id: 'roles', label: 'Vai trò & Ma trận phân quyền' },
        ]}
      />

      <AdminApiError error={users.error} retry={() => void users.refetch()} />
      <AdminApiError error={staff.error} retry={() => void staff.refetch()} />
      <AdminApiError error={mutation.error} />

      {activeTab === 'users' ? (
        <Card>
          <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
            <form
              className="flex min-w-64 flex-1 items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(searchInput.trim());
                setPage(1);
              }}
            >
              <label className={`${fieldLabelClass} flex-1`}>
                Tìm tài khoản
                <input
                  type="search"
                  placeholder="Tên hiển thị hoặc email"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className={controlClass}
                />
              </label>
              <Button type="submit" icon="search">
                Tìm kiếm
              </Button>
            </form>
            <label className={`${fieldLabelClass} w-44`}>
              Vai trò
              <select
                className={controlClass}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                aria-label="Lọc theo vai trò"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="superadmin">Quản trị viên</option>
                <option value="moderator">Kiểm duyệt viên</option>
                <option value="member">Thành viên</option>
              </select>
            </label>
            <label className={`${fieldLabelClass} w-40`}>
              Trạng thái
              <select
                className={controlClass}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Lọc theo trạng thái"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã khóa</option>
              </select>
            </label>
            <Button
              icon="refresh"
              disabled={users.isFetching}
              onClick={() => {
                void users.refetch();
                void staff.refetch();
              }}
            >
              Làm mới
            </Button>
          </div>

          {users.isPending ? (
            <div className="flex flex-col gap-2 p-5">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState icon="users" title="Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm." />
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Người dùng</th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Vai trò</th>
                    <th className={thClass}>Trạng thái</th>
                    <th className={`${thClass} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    const isLocked = member.status === 'locked';
                    const role = ROLE_META[member.role] ?? ROLE_META.member!;
                    const name = member.displayName || member.email;
                    return (
                      <tr key={member.id} className={cn('hover:bg-surface', isLocked && 'opacity-70')}>
                        <td className={tdClass}>
                          <span className="flex items-center gap-3">
                            <span
                              className={cn(
                                'grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold',
                                member.role === 'superadmin'
                                  ? 'bg-navy text-background'
                                  : member.role === 'moderator'
                                    ? 'bg-teal text-background'
                                    : 'bg-surface-muted text-text-muted',
                              )}
                              aria-hidden="true"
                            >
                              {getInitials(name)}
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate">{member.displayName || 'Chưa đặt tên'}</strong>
                              <code className="text-xs text-text-subtle">#{shortId(member.id)}</code>
                            </span>
                          </span>
                        </td>
                        <td className={`${tdClass} text-text-muted`}>{member.email}</td>
                        <td className={tdClass}>
                          <Badge tone={role.tone}>{role.label}</Badge>
                        </td>
                        <td className={tdClass}>
                          <Badge tone={isLocked ? 'danger' : 'teal'} hasDot>
                            {isLocked ? 'Đã khóa' : 'Hoạt động'}
                          </Badge>
                        </td>
                        <td className={`${tdClass} text-right`}>
                          {isSelf ? (
                            <span className="text-xs text-text-muted">Tài khoản hiện tại</span>
                          ) : member.role === 'superadmin' ? (
                            <span className="text-xs text-text-muted">Superadmin</span>
                          ) : (
                            <span className="inline-flex flex-nowrap justify-end gap-2 whitespace-nowrap">
                              {member.role === 'moderator' ? (
                                <Button
                                  size="sm"
                                  disabled={mutation.isPending}
                                  title="Thu hồi quyền kiểm duyệt, hạ về thành viên"
                                  onClick={() => runAction(member, 'revoke')}
                                >
                                  Thu hồi kiểm duyệt
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="accent"
                                  disabled={mutation.isPending || isLocked}
                                  title="Cấp quyền kiểm duyệt viên cho người dùng này"
                                  onClick={() => runAction(member, 'grant')}
                                >
                                  Cấp quyền kiểm duyệt
                                </Button>
                              )}
                              {isLocked ? (
                                <Button size="sm" disabled={mutation.isPending} onClick={() => runAction(member, 'unlock')}>
                                  Mở khóa
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={mutation.isPending}
                                  title="Khóa tài khoản và đăng xuất mọi phiên ngay lập tức"
                                  onClick={() => runAction(member, 'lock')}
                                >
                                  Khóa
                                </Button>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-text-muted">
            <span>
              Hiển thị <strong className="text-text">{filteredItems.length}</strong> trên tổng số{' '}
              <strong className="text-text">{total ?? '—'}</strong> tài khoản
            </span>
            <span className="flex items-center gap-2">
              <Button size="sm" disabled={page <= 1 || users.isFetching} onClick={() => setPage(page - 1)}>
                Trang trước
              </Button>
              <span className="font-semibold text-text">Trang {page}</span>
              <Button size="sm" disabled={!hasNextPage || users.isFetching} onClick={() => setPage(page + 1)}>
                Trang sau
              </Button>
            </span>
          </footer>
        </Card>
      ) : (
        <Card>
          <CardHeader
            icon="shield"
            title="Ma trận phân quyền"
            hint="Tripflix có 3 vai trò cố định. Kiểm duyệt viên chỉ thao tác kiểm duyệt, không xem thanh toán và không quản lý nhân sự."
          />
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Quyền</th>
                  {(['member', 'moderator', 'superadmin'] as const).map((role) => (
                    <th key={role} className={`${thClass} text-center`}>
                      {ROLE_META[role]!.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((permission) => (
                  <tr key={permission.label}>
                    <td className={tdClass}>{permission.label}</td>
                    {(['member', 'moderator', 'superadmin'] as const).map((role) => (
                      <td key={role} className={`${tdClass} text-center`}>
                        <span
                          className={cn(
                            'inline-grid size-6 place-items-center rounded-full',
                            permission[role] ? 'bg-teal-soft text-teal-ink' : 'bg-surface-muted text-text-subtle',
                          )}
                        >
                          <Icon name={permission[role] ? 'check' : 'close'} size={14} />
                          <span className="sr-only">{permission[role] ? 'Có' : 'Không'}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateStaffDrawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

/** Tạo kiểm duyệt viên (TF056): không có mật khẩu, nhân sự nhận email để tự đặt mật khẩu. */
function CreateStaffDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: (payload: { email: string; displayName: string }) =>
      admin.adminControllerCreateStaff({ ...payload, role: 'moderator' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      setDisplayName('');
      setEmail('');
      setError(null);
    },
    onError: (err: unknown) => {
      // Lỗi 4xx của core-api có message tiếng Việt (ví dụ "Email đã tồn tại trong hệ thống").
      const message = err instanceof HttpError ? (err.body as { message?: unknown } | null)?.message : undefined;
      setError(
        typeof message === 'string' && err instanceof HttpError && err.status < 500
          ? message
          : 'Không thể tạo tài khoản. Vui lòng thử lại.',
      );
    },
  });
  const close = () => {
    createMutation.reset();
    setError(null);
    onClose();
  };
  return (
    <Drawer isOpen={isOpen} onClose={close} title="Tạo tài khoản nhân sự mới" closeLabel="Đóng">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (!displayName.trim()) return setError('Vui lòng nhập họ tên nhân sự.');
          if (!email.trim() || !email.includes('@')) return setError('Vui lòng nhập email hợp lệ.');
          createMutation.mutate({ displayName: displayName.trim(), email: email.trim() });
        }}
      >
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {createMutation.isSuccess && (
          <output className="rounded-lg bg-teal-soft px-3 py-2 text-sm font-semibold text-teal-ink">
            Đã tạo tài khoản cho {createMutation.variables.displayName}. Email đặt mật khẩu đã gửi tới{' '}
            {createMutation.variables.email}.
          </output>
        )}
        <label className={fieldLabelClass} htmlFor="new-staff-name">
          Họ và tên / Tên hiển thị
          <input
            id="new-staff-name"
            type="text"
            required
            placeholder="VD: Nguyễn Thu Trang"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={controlClass}
          />
        </label>
        <label className={fieldLabelClass} htmlFor="new-staff-email">
          Email công việc
          <input
            id="new-staff-email"
            type="email"
            required
            placeholder="VD: mod_trang@tripflix.vn"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={controlClass}
          />
        </label>
        <div className="rounded-xl border border-teal/30 bg-teal-soft/50 p-3 text-sm">
          <strong className="block">Vai trò: Kiểm duyệt viên</strong>
          <span className="text-xs text-text-muted">Duyệt bài, ẩn bài vi phạm và xử lý báo cáo.</span>
        </div>
        <p className="text-xs text-text-muted">
          Nhân sự sẽ nhận email để tự đặt mật khẩu. Link có hiệu lực 30 phút; hết hạn thì dùng &quot;Quên mật
          khẩu&quot; ở trang đăng nhập.
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={close}>Hủy bỏ</Button>
          <Button type="submit" variant="primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Đang tạo…' : 'Xác nhận tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
