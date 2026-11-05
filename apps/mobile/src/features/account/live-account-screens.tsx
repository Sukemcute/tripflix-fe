import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { UserDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Notice, Screen, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount, UnavailableScreen } from '@/components/api-state';

export function LiveProfileScreen() {
  const { user, isReady } = useApiSession();
  if (!isReady || !user) return <RequireAccount />;
  return <ProfileEditor key={user.id} user={user} />;
}
function ProfileEditor({ user }: { user: UserDto }) {
  const { session } = useApiSession();
  const client = useQueryClient();
  const [name, setName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const query = useQuery({
    queryKey: ['account', 'sessions', user.id],
    queryFn: async ({ signal }) => (await auth.accountControllerListSessions({ signal })).data,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'profile' | 'password' | 'logout' | 'logoutAll' | { revoke: string }) => {
      if (action === 'profile') {
        await auth.accountControllerUpdateProfile({ displayName: name.trim() });
        await session.reloadUser();
      } else if (action === 'password')
        await auth.accountControllerChangePassword({ currentPassword, newPassword });
      else if (action === 'logout') await session.logout();
      else if (action === 'logoutAll') await session.logoutAll();
      else {
        await auth.accountControllerRevokeSession(encodeURIComponent(action.revoke));
        if (query.data?.find((device) => device.id === action.revoke)?.isCurrent) await session.initialize();
      }
    },
    onSuccess: async (_, action) => {
      if (action === 'password') {
        setCurrentPassword('');
        setNewPassword('');
      }
      await client.invalidateQueries({ queryKey: ['account'] });
    },
  });
  return (
    <Screen title={vi.api.account} back={false}>
      <Txt variant="title">{user.displayName}</Txt>
      <Txt>{user.email}</Txt>
      <Button tone="secondary" onPress={() => router.push('/saved')}>
        {vi.api.bookmarks}
      </Button>
      <Button tone="secondary" onPress={() => router.push('/create')}>
        {vi.api.create}
      </Button>
      <Button tone="secondary" onPress={() => router.push({ pathname: '/search', params: { view: 'mine' } })}>
        {vi.api.myPosts}
      </Button>
      <Field label={vi.api.displayName} value={name} onChangeText={setName} maxLength={50} />
      <Button disabled={mutation.isPending || !name.trim()} onPress={() => mutation.mutate('profile')}>
        {vi.api.save}
      </Button>
      <Txt variant="heading">{vi.api.changePassword}</Txt>
      <Field
        label={vi.api.currentPassword}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <Field
        label={vi.api.newPassword}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
      />
      <Button
        disabled={mutation.isPending || !currentPassword || newPassword.length < 8}
        onPress={() => mutation.mutate('password')}
      >
        {vi.api.changePassword}
      </Button>
      <ApiErrorNotice error={mutation.error} />
      {mutation.isSuccess && <Notice>{vi.api.saved}</Notice>}
      <Txt variant="heading">{vi.api.sessions}</Txt>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {query.data?.map((device) => (
        <Card key={device.id}>
          <Txt variant="label">
            {device.deviceName ?? vi.api.unknownDevice}
            {device.isCurrent ? ` · ${vi.api.currentSession}` : ''}
          </Txt>
          <Txt variant="small">{new Date(device.lastUsedAt).toLocaleString('vi-VN')}</Txt>
          <Button
            tone="text"
            disabled={mutation.isPending}
            onPress={() => mutation.mutate({ revoke: device.id })}
          >
            {vi.api.revoke}
          </Button>
        </Card>
      ))}
      <Button tone="secondary" disabled={mutation.isPending} onPress={() => mutation.mutate('logoutAll')}>
        {vi.api.logoutAll}
      </Button>
      <Button tone="text" disabled={mutation.isPending} onPress={() => mutation.mutate('logout')}>
        {vi.api.logout}
      </Button>
    </Screen>
  );
}
export function LiveNotificationsScreen() {
  return <UnavailableScreen message={vi.api.notificationUnavailable} />;
}
export function LiveTripsScreen() {
  return <UnavailableScreen />;
}
