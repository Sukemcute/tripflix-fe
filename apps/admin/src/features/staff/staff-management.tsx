'use client';
import { useState } from 'react';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminUserDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { AdminDialog, ConfirmDialog } from '@/ui/dialog';
import { FilterToolbar, SearchField, SelectField } from '@/ui/filter-toolbar';
import { TextField } from '@/ui/form-field';
import { Pagination } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { readEnumParam, readPageParam } from '@/ui/url-params';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
const copy = vi.adminOperations;
const roles = { member: copy.member, moderator: copy.moderator, superadmin: copy.superadmin };
const ROLE_FILTERS = ['', 'member', 'moderator', 'superadmin'] as const;
const STATUS_FILTERS = ['', 'active', 'locked'] as const;
const TAB_IDS = ['users', 'roles'] as const;
type StaffAction = 'lock' | 'unlock' | 'grant' | 'revoke';

const PERMISSIONS: readonly (readonly [string, boolean, boolean, boolean])[] = [
  [copy.permissionContent, false, true, true],
  [copy.permissionRead, false, true, true],
  [copy.permissionRun, false, false, true],
  [copy.permissionStaff, false, false, true],
  [copy.permissionInventory, false, false, true],
];

export function StaffManagement() {
  const { user: currentUser } = useApiSession();
  const client = useQueryClient();
  const { params, update } = useUrlParams();
  const tab = readEnumParam(params.get('tab'), TAB_IDS, 'users');
  const query = params.get('q') ?? '';
  const role = readEnumParam(params.get('role'), ROLE_FILTERS, '');
  const status = readEnumParam(params.get('status'), STATUS_FILTERS, '');
  const page = readPageParam(params.get('page'));
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pendingAction, setPendingAction] = useState<{ member: AdminUserDto; action: StaffAction } | null>(
    null,
  );
  const users = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: async ({ signal }) => (await admin.adminControllerSearchUsers({ query, page }, { signal })).data,
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async ({ signal }) => (await admin.adminControllerListStaff({ signal })).data,
  });
  const mutation = useMutation({
    mutationFn: async ({ member, action }: { member: AdminUserDto; action: StaffAction }) => {
      if (action === 'lock') return admin.adminControllerLock(member.id);
      if (action === 'unlock') return admin.adminControllerUnlock(member.id);
      if (action === 'grant') return admin.adminControllerGrantModerator({ userId: member.id });
      return admin.adminControllerRevokeModerator(member.id);
    },
    onSuccess: () => {
      setPendingAction(null);
      void client.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const create = useMutation({
    mutationFn: () =>
      admin.adminControllerCreateStaff({ email: email.trim(), displayName: name.trim(), role: 'moderator' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      setName('');
      setEmail('');
    },
  });
  const items = users.data?.items ?? [];
  // Máy chủ chỉ lọc theo từ khoá; vai trò và trạng thái được lọc trên trang đang tải (đã ghi chú cho người dùng).
  const filtered = items.filter(
    (member) => (!role || member.role === role) && (!status || member.status === status),
  );
  const hasLocalFilter = !!(role || status);
  const hasActiveFilters = !!(query || hasLocalFilter);
  const createMessage =
    create.error instanceof HttpError &&
    create.error.status < 500 &&
    typeof (create.error.body as { message?: unknown })?.message === 'string'
      ? (create.error.body as { message: string }).message
      : copy.createFailure;

  const columns: DataColumn<AdminUserDto>[] = [
    {
      id: 'account',
      header: copy.account,
      cell: (member) => (
        <div className="flex items-center gap-3" aria-label={`${member.displayName} · ${member.email}`}>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-adm bg-surface-muted text-xs"
            aria-hidden="true"
          >
            {member.displayName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate">{member.displayName}</p>
            <p className="truncate text-xs text-text-muted">{member.email}</p>
            <code className="block max-w-56 truncate font-mono text-xs text-text-muted" title={member.id}>
              {member.id}
            </code>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: copy.role,
      cell: (member) => (
        <StatusBadge tone={member.role === 'member' ? 'neutral' : 'info'}>{roles[member.role]}</StatusBadge>
      ),
    },
    {
      id: 'status',
      header: copy.status,
      cell: (member) => (
        <StatusBadge tone={member.status === 'locked' ? 'danger' : 'success'}>
          {member.status === 'locked' ? copy.locked : copy.active}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: copy.action,
      cell: (member) =>
        member.id === currentUser?.id ? (
          <span className="text-xs text-text-muted">{copy.self}</span>
        ) : member.role === 'superadmin' ? (
          <span className="text-xs text-text-muted">{copy.protected}</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(
              [
                member.role === 'moderator' ? 'revoke' : 'grant',
                member.status === 'locked' ? 'unlock' : 'lock',
              ] as StaffAction[]
            ).map((action) => (
              <AdminButton
                key={action}
                size="sm"
                variant={action === 'lock' || action === 'revoke' ? 'danger' : 'secondary'}
                aria-label={copy[action]}
                disabled={mutation.isPending}
                onClick={() => {
                  mutation.reset();
                  setPendingAction({ member, action });
                }}
              >
                {copy[action]}
              </AdminButton>
            ))}
          </div>
        ),
    },
  ];

  const permissionColumns: DataColumn<(typeof PERMISSIONS)[number]>[] = [
    { id: 'permission', header: copy.role, cell: ([label]) => label },
    ...(['member', 'moderator', 'superadmin'] as const).map(
      (key, index): DataColumn<(typeof PERMISSIONS)[number]> => ({
        id: key,
        header: roles[key],
        cell: (row) => (
          <StatusBadge tone={row[index + 1] ? 'success' : 'neutral'}>
            {row[index + 1] ? copy.allowed : copy.denied}
          </StatusBadge>
        ),
      }),
    ),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          label={copy.staffTitle}
          idPrefix="staff"
          active={tab}
          onChange={(next) => update({ tab: next === 'users' ? null : next })}
          tabs={[
            { id: 'users', label: copy.usersTab },
            { id: 'roles', label: copy.rolesTab },
          ]}
        />
        <AdminButton
          variant="primary"
          onClick={() => {
            create.reset();
            setCreating(true);
          }}
        >
          {copy.createStaff}
        </AdminButton>
      </div>
      <AdminApiError error={staff.error} retry={() => void staff.refetch()} />
      <TabPanel idPrefix="staff" active={tab}>
        {tab === 'users' ? (
          <div className="space-y-3">
            <FilterToolbar
              hasActiveFilters={hasActiveFilters}
              onReset={() => update({ q: null, role: null, status: null, page: null })}
              summary={
                users.data
                  ? t('adminOperations.table.shown', {
                      shown: filtered.length,
                      total: users.data.total.toLocaleString('vi-VN'),
                    })
                  : undefined
              }
            >
              <SearchField
                label={copy.searchUsers}
                placeholder={copy.searchUsers}
                maxLength={254}
                value={query}
                onChange={(value) => update({ q: value, page: null })}
              />
              <SelectField
                label={copy.role}
                value={role}
                allLabel={copy.allRoles}
                options={Object.entries(roles).map(([value, label]) => ({ value, label }))}
                onChange={(value) => update({ role: value })}
              />
              <SelectField
                label={copy.status}
                value={status}
                allLabel={copy.allStatuses}
                options={[
                  { value: 'active', label: copy.active },
                  { value: 'locked', label: copy.locked },
                ]}
                onChange={(value) => update({ status: value })}
              />
            </FilterToolbar>
            {hasLocalFilter && <p className="text-xs text-text-muted">{copy.filterOnPage}</p>}
            <AdminApiError error={users.error} retry={() => void users.refetch()} />
            <DataTable
              label={copy.staffTitle}
              columns={columns}
              rows={filtered}
              getRowId={(member) => member.id}
              isLoading={users.isPending}
              empty={!users.error && <EmptyState title={copy.empty} />}
            />
            {users.data && (
              <Pagination
                page={page}
                pageSize={users.data.pageSize}
                total={users.data.total}
                isFetching={users.isFetching}
                onPageChange={(next) => update({ page: next === 1 ? null : String(next) })}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-text-muted">
              {copy.permissionHint} ·{' '}
              {t('adminOperations.staffCounts', {
                moderators: staff.data?.filter((member) => member.role === 'moderator').length ?? '—',
                administrators: staff.data?.filter((member) => member.role === 'superadmin').length ?? '—',
              })}
            </p>
            <DataTable
              label={copy.rolesFixed}
              columns={permissionColumns}
              rows={PERMISSIONS}
              getRowId={(row) => row[0]}
            />
          </div>
        )}
      </TabPanel>
      {creating && (
        <AdminDialog
          title={copy.createStaff}
          description={copy.createHint}
          onClose={() => setCreating(false)}
          isPending={create.isPending}
          footer={
            <>
              <AdminButton disabled={create.isPending} onClick={() => setCreating(false)}>
                {create.isSuccess ? copy.done : copy.cancel}
              </AdminButton>
              {!create.isSuccess && (
                <AdminButton
                  type="submit"
                  form="create-staff-form"
                  variant="primary"
                  disabled={create.isPending || !name.trim() || !email.trim()}
                >
                  {create.isPending ? copy.saving : copy.createStaff}
                </AdminButton>
              )}
            </>
          }
        >
          {create.isSuccess ? (
            <output className="block rounded-adm bg-sea-mist px-3 py-2 text-[13px] text-teal-ink">
              {copy.createSuccess}
            </output>
          ) : (
            <form
              id="create-staff-form"
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) create.mutate();
              }}
            >
              <TextField
                label={copy.displayName}
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={create.isPending}
              />
              <TextField
                label={vi.api.email}
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={create.isPending}
              />
              {create.isError && (
                <p className="text-[13px] text-coral-ink" role="alert">
                  {createMessage}
                </p>
              )}
            </form>
          )}
        </AdminDialog>
      )}
      {pendingAction && (
        <ConfirmDialog
          title={copy[pendingAction.action]}
          description={`${pendingAction.member.displayName} · ${pendingAction.member.email}`}
          confirmLabel={copy.confirm}
          tone={pendingAction.action === 'lock' || pendingAction.action === 'revoke' ? 'danger' : 'primary'}
          isPending={mutation.isPending}
          onConfirm={() => mutation.mutate(pendingAction)}
          onClose={() => setPendingAction(null)}
        >
          <div className="space-y-3">
            <p className="text-[13px] leading-5">{copy.confirmStaff}</p>
            <AdminApiError error={mutation.error} />
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
