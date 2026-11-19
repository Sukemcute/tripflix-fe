import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changePassword, useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { UserDto } from '@tripflix/api-client/core-api/model/index';
import { DISPLAY_NAME_MAX, NEW_PASSWORD_MAX } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, nativeFonts, radius, spacing as s } from '@tripflix/tokens';
import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, copy, Field, Icon, Notice, Screen, Sheet, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount, UnavailableScreen } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';

const profile = copy.profile;

/** Menu cài đặt (TF47B): mở từ nút bánh răng trên trang cá nhân ở tab Tôi. */
export function LiveProfileScreen() {
  const { user, error, session } = useApiSession();
  const [help, setHelp] = useState(false);
  const text = profile.hub;
  const groups = [
    {
      title: text.accountGroup,
      tone: c.seaMist,
      items: [
        {
          label: profile.settings,
          icon: 'person-outline',
          onPress: () =>
            router.push(
              user ? '/account-settings' : { pathname: '/login', params: { returnTo: '/account-settings' } },
            ),
        },
        {
          label: text.preferences,
          icon: 'compass-outline',
          onPress: () => router.push({ pathname: '/onboarding', params: { mode: 'edit' } }),
        },
      ],
    },
    {
      title: text.activityGroup,
      tone: c.sunSoft,
      items: [
        {
          label: copy.common.notification,
          icon: 'notifications-outline',
          onPress: () => router.push('/notifications'),
        },
        {
          label: text.moderation,
          icon: 'shield-checkmark-outline',
          onPress: () => router.push('/moderation-status' as Href),
        },
        { label: profile.help, icon: 'help-buoy-outline', onPress: () => setHelp(true) },
      ],
    },
  ] as const;
  return (
    <Screen compact title={profile.menu}>
      <Txt style={styles.title} accessibilityRole="header">
        {profile.menu}
      </Txt>
      <Txt style={styles.body}>{text.settingsBody}</Txt>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      {groups.map((group) => (
        <View key={group.title} style={[styles.menuGroup, { backgroundColor: group.tone }]}>
          <Txt style={styles.groupTitle} accessibilityRole="header">
            {group.title}
          </Txt>
          {group.items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.menu, pressed && ui.pressed]}
            >
              <Icon name={item.icon} size={22} color={c.ink} />
              <Txt style={styles.menuLabel}>{item.label}</Txt>
              <Icon name="chevron-forward" size={18} color={c.ink} />
            </Pressable>
          ))}
        </View>
      ))}
      <Sheet title={profile.help} visible={help} onClose={() => setHelp(false)}>
        <Txt style={styles.body}>{profile.liveHelpBody}</Txt>
      </Sheet>
    </Screen>
  );
}

export function LiveAccountSettingsScreen() {
  const { user, isReady } = useApiSession();
  if (!isReady) return <RequireAccount />;
  if (!user) return <Redirect href="/(tabs)/me" />;
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
        // Cả hai mật khẩu được mã hoá trước khi gửi (TF056).
        await changePassword({ currentPassword, newPassword });
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
    <Screen title={profile.settings}>
      <Txt variant="title">{user.displayName}</Txt>
      <Txt variant="small" style={ui.muted}>
        {user.email}
      </Txt>
      <Field label={vi.api.displayName} value={name} onChangeText={setName} maxLength={DISPLAY_NAME_MAX} />
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
        maxLength={NEW_PASSWORD_MAX}
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
      {query.isPending && <LoadingDots />}
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
export { LiveNotificationsScreen } from './notifications-screen';
export function LiveTripsScreen() {
  return <UnavailableScreen />;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 38, fontFamily: nativeFonts.bold, color: c.navy },
  body: { fontSize: 16, lineHeight: 25, color: c.ink },
  menuGroup: { padding: s.lg, gap: s.sm, borderRadius: radius.md },
  groupTitle: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: c.navy },
  menu: { flexDirection: 'row', alignItems: 'center', gap: s.md, paddingVertical: s.md, minHeight: 56 },
  menuLabel: { flex: 1, fontSize: 16, lineHeight: 25, color: c.ink },
});
