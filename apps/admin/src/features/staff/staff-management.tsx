'use client';
import { useState } from 'react';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminUserDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Metric, Panel } from '../shell/operations-ui';
import { OperationsDialog } from '../shell/operations-dialog';
const copy = vi.adminOperations;
const roles = { member: copy.member, moderator: copy.moderator, superadmin: copy.superadmin };
type StaffAction = 'lock' | 'unlock' | 'grant' | 'revoke';

export function StaffManagement() {
  const { user: currentUser } = useApiSession();
  const client = useQueryClient();
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
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
  const filtered = items.filter(
    (member) => (!role || member.role === role) && (!status || member.status === status),
  );
  const pageCount = users.data ? Math.max(1, Math.ceil(users.data.total / users.data.pageSize)) : 1;
  const createMessage =
    create.error instanceof HttpError &&
    create.error.status < 500 &&
    typeof (create.error.body as { message?: unknown })?.message === 'string'
      ? (create.error.body as { message: string }).message
      : copy.createFailure;
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={copy.staffTitle}>
        <Metric label={copy.totalUsers} value={users.data?.total} />
        <Metric
          label={copy.moderators}
          value={staff.data?.filter((member) => member.role === 'moderator').length}
        />
        <Metric
          label={copy.administrators}
          value={staff.data?.filter((member) => member.role === 'superadmin').length}
        />
        <Metric
          label={copy.activeOnPage}
          value={users.data ? items.filter((member) => member.status === 'active').length : undefined}
          hint={copy.currentPage}
        />
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 border-b border-border text-xs">
          <button
            className={`border-b-2 py-3 ${tab === 'users' ? 'border-teal-ink font-bold text-teal-ink' : 'border-transparent text-text-muted'}`}
            onClick={() => setTab('users')}
            aria-pressed={tab === 'users'}
          >
            {copy.usersTab}
          </button>
          <button
            className={`border-b-2 py-3 ${tab === 'roles' ? 'border-teal-ink font-bold text-teal-ink' : 'border-transparent text-text-muted'}`}
            onClick={() => setTab('roles')}
            aria-pressed={tab === 'roles'}
          >
            {copy.rolesTab}
          </button>
        </div>
        <button
          className="admin-primary"
          onClick={() => {
            create.reset();
            setCreating(true);
          }}
        >
          {copy.createStaff} +
        </button>
      </div>
      <AdminApiError error={staff.error} retry={() => void staff.refetch()} />
      {tab === 'users' ? (
        <Panel title={copy.staffTitle} description={copy.staffHint}>
          <div className="flex flex-wrap items-end gap-3 border-b border-border p-5">
            <form
              className="flex flex-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(searchInput.trim());
                setPage(1);
              }}
            >
              <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-[10px] text-text-muted">
                {copy.searchUsers}
                <input
                  type="search"
                  value={searchInput}
                  maxLength={254}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>
              <button className="admin-secondary self-end" type="submit">
                {copy.search}
              </button>
            </form>
            <label className="grid gap-1.5 text-[10px] text-text-muted">
              {copy.role}
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">{copy.allRoles}</option>
                {Object.entries(roles).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] text-text-muted">
              {copy.status}
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">{copy.allStatuses}</option>
                <option value="active">{copy.active}</option>
                <option value="locked">{copy.locked}</option>
              </select>
            </label>
          </div>
          <p className="px-5 py-3 text-[10px] text-text-muted">{copy.filterLoaded}</p>
          <AdminApiError error={users.error} retry={() => void users.refetch()} />
          {users.isPending ? (
            <LoadingState />
          ) : !filtered.length && !users.error ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>{copy.account}</th>
                    <th>{copy.role}</th>
                    <th>{copy.status}</th>
                    <th>{copy.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member) => (
                    <tr key={member.id}>
                      <td aria-label={`${member.displayName} · ${member.email}`}>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sea-mist font-bold text-teal-ink"
                            aria-hidden="true"
                          >
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold">{member.displayName}</p>
                            <p className="text-[10px] text-text-muted">{member.email}</p>
                            <code className="text-[9px] text-text-subtle">{member.id}</code>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`ops-tag ${member.role === 'moderator' ? 'text-teal-ink' : ''}`}>
                          {roles[member.role]}
                        </span>
                      </td>
                      <td aria-label={copy.status}>
                        <span
                          className={`ops-tag ${member.status === 'locked' ? 'text-danger' : 'text-teal-ink'}`}
                        >
                          {member.status === 'locked' ? copy.locked : copy.active}
                        </span>
                      </td>
                      <td aria-label={copy.action}>
                        {member.id === currentUser?.id ? (
                          <span className="text-[10px] text-text-muted">{copy.self}</span>
                        ) : member.role === 'superadmin' ? (
                          <span className="text-[10px] text-text-muted">{copy.protected}</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                member.role === 'moderator' ? 'revoke' : 'grant',
                                member.status === 'locked' ? 'unlock' : 'lock',
                              ] as StaffAction[]
                            ).map((action) => (
                              <button
                                className={`admin-secondary ${action === 'lock' || action === 'revoke' ? 'text-danger' : ''}`}
                                key={action}
                                aria-label={copy[action]}
                                disabled={mutation.isPending}
                                onClick={() => {
                                  mutation.reset();
                                  setPendingAction({ member, action });
                                }}
                              >
                                {copy[action]}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-[10px] text-text-muted">
            <span>
              {filtered.length} / {users.data?.total ?? '—'} · {copy.page} {page}/{pageCount}
            </span>
            <div className="flex gap-2">
              <button
                className="admin-secondary"
                disabled={page <= 1 || users.isFetching}
                onClick={() => setPage(page - 1)}
              >
                {copy.previous}
              </button>
              <button
                className="admin-secondary"
                disabled={page >= pageCount || users.isFetching}
                onClick={() => setPage(page + 1)}
              >
                {copy.next}
              </button>
            </div>
          </footer>
        </Panel>
      ) : (
        <Panel title={copy.rolesFixed} description={copy.permissionHint}>
          <div className="overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{copy.role}</th>
                  <th>{copy.member}</th>
                  <th>{copy.moderator}</th>
                  <th>{copy.superadmin}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [copy.permissionContent, false, true, true],
                  [copy.permissionRead, false, true, true],
                  [copy.permissionRun, false, false, true],
                  [copy.permissionStaff, false, false, true],
                  [copy.permissionInventory, false, false, true],
                ].map(([label, ...values]) => (
                  <tr key={String(label)}>
                    <td className="font-bold">{label}</td>
                    {values.map((value, index) => (
                      <td key={index} className={value ? 'text-teal-ink' : 'text-text-subtle'}>
                        {value ? copy.allowed : copy.denied}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {creating && (
        <OperationsDialog
          title={copy.createStaff}
          onClose={() => setCreating(false)}
          isPending={create.isPending}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <div className="space-y-4 p-6">
              <p className="text-xs leading-relaxed text-text-muted">{copy.createHint}</p>
              {create.isSuccess ? (
                <output className="block rounded-lg bg-sea-mist p-4 text-xs text-teal-ink">
                  {copy.createSuccess}
                </output>
              ) : (
                <>
                  <label className="grid gap-2 text-xs font-bold" htmlFor="new-staff-name">
                    {copy.displayName}
                    <input
                      id="new-staff-name"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={create.isPending}
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-bold" htmlFor="new-staff-email">
                    {vi.api.email}
                    <input
                      id="new-staff-email"
                      type="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={create.isPending}
                    />
                  </label>
                  {create.isError && (
                    <p className="text-xs text-danger" role="alert">
                      {createMessage}
                    </p>
                  )}
                </>
              )}
            </div>
            <footer className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                className="admin-secondary"
                disabled={create.isPending}
                onClick={() => setCreating(false)}
              >
                {create.isSuccess ? copy.done : copy.cancel}
              </button>
              {!create.isSuccess && (
                <button
                  type="submit"
                  className="admin-primary"
                  disabled={create.isPending || !name.trim() || !email.trim()}
                >
                  {create.isPending ? copy.saving : copy.createStaff}
                </button>
              )}
            </footer>
          </form>
        </OperationsDialog>
      )}
      {pendingAction && (
        <OperationsDialog
          title={copy[pendingAction.action]}
          onClose={() => setPendingAction(null)}
          isPending={mutation.isPending}
        >
          <div className="space-y-3 p-6">
            <p className="text-sm font-bold">{pendingAction.member.displayName}</p>
            <p className="text-xs text-text-muted">{pendingAction.member.email}</p>
            <p className="text-xs leading-relaxed">{copy.confirmStaff}</p>
            <AdminApiError error={mutation.error} />
          </div>
          <footer className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button
              className="admin-secondary"
              disabled={mutation.isPending}
              onClick={() => setPendingAction(null)}
            >
              {copy.cancel}
            </button>
            <button
              className="admin-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(pendingAction)}
            >
              {mutation.isPending ? copy.saving : copy.confirm}
            </button>
          </footer>
        </OperationsDialog>
      )}
    </div>
  );
}
