import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changePassword, useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { UserDto } from '@tripflix/api-client/core-api/model/index';
import { DISPLAY_NAME_MAX, NEW_PASSWORD_MAX } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, nativeFonts, spacing as s } from '@tripflix/tokens';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  copy,
  Field,
  Icon,
  IconButton,
  Logo,
  Notice,
  Screen,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount, UnavailableScreen } from '@/components/api-state';

const profile = copy.profile;

export function LiveProfileScreen() {
  const { user, isReady, error, session } = useApiSession();
  const [help, setHelp] = useState(false);
  const login = () => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/me' } });
  const links = [
    { label: profile.myTrips, icon: 'bag-handle-outline', onPress: () => router.navigate('/(tabs)/trips') },
    { label: profile.savedTrips, icon: 'bookmark-outline', onPress: () => router.push('/saved') },
    {
      label: profile.create,
      icon: 'create-outline',
      onPress: () => router.push(user ? '/create' : { pathname: '/login', params: { returnTo: '/create' } }),
    },
    {
      label: copy.common.notification,
      icon: 'notifications-outline',
      onPress: () => router.push('/notifications'),
    },
    { label: profile.help, icon: 'help-buoy-outline', onPress: () => setHelp(true) },
  ] as const;
  const stats = [
    {
      label: profile.posts,
      icon: 'albums-outline',
      onPress: () => router.push({ pathname: '/search', params: { view: 'mine' } }),
    },
    { label: copy.tabs.trips, icon: 'bag-handle-outline', onPress: links[0].onPress },
    { label: profile.saved, icon: 'bookmark-outline', onPress: links[1].onPress },
  ] as const;
  const initials = user?.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase('vi-VN');

  return (
    <Screen header={null} padded={false}>
      <View>
        <View style={styles.cover}>
          <Logo />
          <IconButton
            name="settings-outline"
            label={profile.settings}
            light
            onPress={() =>
              router.push(
                user
                  ? '/account-settings'
                  : {
                      pathname: '/login',
                      params: { returnTo: '/account-settings' },
                    },
              )
            }
          />
        </View>
        <View style={styles.profileBody}>
          <View style={styles.avatar}>
            <Txt variant="title" style={styles.avatarText}>
              {initials || 'TF'}
            </Txt>
          </View>
          <Txt variant="title" style={styles.profileName}>
            {isReady ? (user?.displayName ?? profile.guest) : vi.api.loading}
          </Txt>
          {isReady && (
            <Txt variant="small" style={ui.muted}>
              {user?.email ?? profile.body}
            </Txt>
          )}
          {isReady && !user && (
            <Button onPress={login} style={styles.signIn}>
              {profile.login}
            </Button>
          )}
          <ApiErrorNotice
            error={error}
            retry={() => {
              void session.initialize();
            }}
          />
          <View style={styles.stats}>
            {stats.map((item, index) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={item.onPress}
                style={[styles.stat, index < stats.length - 1 && styles.statDivider]}
              >
                <Icon name={item.icon} size={20} />
                <Txt variant="caption" style={[ui.center, ui.muted]}>
                  {item.label}
                </Txt>
              </Pressable>
            ))}
          </View>
          {links.map((item) => (
            <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={styles.menu}>
              <View style={styles.menuIcon}>
                <Icon name={item.icon} color={c.tealInk} size={20} />
              </View>
              <Txt variant="small" style={ui.flex}>
                {item.label}
              </Txt>
              <Icon name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
          <Txt variant="caption" style={[ui.center, ui.muted, styles.tagline]}>
            {vi.app.slogan}.
          </Txt>
        </View>
      </View>
      <Sheet title={profile.help} visible={help} onClose={() => setHelp(false)}>
        <Txt variant="small">{profile.liveHelpBody}</Txt>
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
  return (
    <Screen title={copy.notifications.title}>
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{copy.notifications.headline}</Txt>
        <View style={styles.notification}>
          <View style={styles.menuIcon}>
            <Icon name="notifications-outline" color={c.tealInk} size={20} />
          </View>
          <View style={ui.flex}>
            <Txt variant="small" style={ui.muted}>
              {vi.api.notificationUnavailable}
            </Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}
export function LiveTripsScreen() {
  return <UnavailableScreen />;
}

const styles = StyleSheet.create({
  cover: {
    height: 120,
    backgroundColor: c.seaMist,
    padding: mobileLayout.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileBody: { paddingHorizontal: mobileLayout.gutter },
  avatar: {
    marginTop: -39,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: c.background,
    backgroundColor: c.sunSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, lineHeight: 32, fontFamily: nativeFonts.bold },
  profileName: { fontSize: 23, lineHeight: 32, marginTop: s.md, marginBottom: s.xs },
  signIn: { marginTop: s.lg },
  stats: { flexDirection: 'row', marginVertical: s.xl },
  stat: {
    flex: 1,
    gap: s.xs,
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s.xs,
  },
  statDivider: {
    borderRightColor: c.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  menu: { flexDirection: 'row', alignItems: 'center', gap: s.md, paddingVertical: s.md, minHeight: 60 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.seaMist,
  },
  notification: {
    flexDirection: 'row',
    gap: s.md,
    paddingVertical: s.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  tagline: { marginTop: s.xl },
});
