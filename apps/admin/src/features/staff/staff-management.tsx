'use client';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminUserDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

export function StaffManagement() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const users = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: async ({ signal }) => (await admin.adminControllerSearchUsers({ query, page }, { signal })).data,
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async ({ signal }) => (await admin.adminControllerListStaff({ signal })).data,
  });
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
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
  return (
    <>
      <h2>{vi.api.staff}</h2>
      <AdminApiError
        error={staff.error}
        retry={() => {
          void staff.refetch();
        }}
      />
      {staff.data && (
        <p>
          {staff.data.length} {vi.api.metricStaff.toLowerCase()}
        </p>
      )}
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(input.trim());
          setPage(1);
        }}
      >
        <label>
          {vi.api.search}
          <input value={input} maxLength={100} onChange={(event) => setInput(event.target.value)} />
        </label>
        <button className="admin-primary">{vi.api.search}</button>
      </form>
      <AdminApiError
        error={users.error}
        retry={() => {
          void users.refetch();
        }}
      />
      <AdminApiError error={mutation.error} />
      {mutation.isSuccess && <output>{vi.api.saved}</output>}
      {users.isPending && <output>{vi.api.loading}</output>}
      {users.data?.items.length === 0 && <p className="admin-empty">{vi.api.empty}</p>}
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{vi.api.displayName}</th>
              <th>{vi.api.email}</th>
              <th>{vi.api.role}</th>
              <th>{vi.api.status}</th>
              <th>{vi.api.edit}</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.items.map((member) => (
              <tr key={member.id}>
                <td>{member.displayName}</td>
                <td>{member.email}</td>
                <td>
                  {member.role === 'superadmin'
                    ? vi.api.superadmin
                    : member.role === 'moderator'
                      ? vi.api.moderator
                      : vi.api.user}
                </td>
                <td>{member.status === 'locked' ? vi.api.locked : vi.api.active}</td>
                <td>
                  {member.id !== user?.id && member.role !== 'superadmin' && (
                    <>
                      <button
                        className="admin-secondary"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ member, action: member.status === 'locked' ? 'unlock' : 'lock' })
                        }
                      >
                        {member.status === 'locked' ? vi.api.unlock : vi.api.lock}
                      </button>
                      <button
                        className="admin-secondary"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            member,
                            action: member.role === 'moderator' ? 'revoke' : 'grant',
                          })
                        }
                      >
                        {member.role === 'moderator' ? vi.api.revokeRole : vi.api.grant}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-filters">
        <button
          className="admin-secondary"
          disabled={page <= 1 || users.isFetching}
          onClick={() => setPage(page - 1)}
        >
          {vi.api.previous}
        </button>
        <span>{page}</span>
        <button
          className="admin-secondary"
          disabled={!users.data || page * users.data.pageSize >= users.data.total || users.isFetching}
          onClick={() => setPage(page + 1)}
        >
          {vi.api.next}
        </button>
      </div>
    </>
  );
}
