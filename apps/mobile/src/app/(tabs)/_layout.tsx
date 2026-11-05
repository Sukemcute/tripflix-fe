import Ionicons from '@expo/vector-icons/Ionicons';
import { t, type MessageKey } from '@tripflix/i18n';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import { Tabs, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useApiSession } from '@tripflix/api-client';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Mobile V1 design: creation is an action; notifications live behind the bell.
const TABS: readonly { name: string; label: MessageKey; icon: IconName }[] = [
  { name: 'index', label: 'mobile.tabs.reels', icon: 'play-circle-outline' },
  { name: 'explore', label: 'mobile.tabs.explore', icon: 'compass-outline' },
  { name: 'compose', label: 'mobile.tabs.create', icon: 'add' },
  { name: 'trips', label: 'mobile.tabs.trips', icon: 'bag-handle-outline' },
  { name: 'me', label: 'mobile.tabs.profile', icon: 'person-circle-outline' },
];

export default function TabsLayout() {
  const { user, isReady } = useApiSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralInk,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: nativeFonts.regular, fontSize: 10 },
        tabBarItemStyle: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, minHeight: 70 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={
            tab.name === 'compose'
              ? {
                  tabPress: (event) => {
                    event.preventDefault();
                    if (!isReady) return;
                    router.push(user ? '/create' : { pathname: '/login', params: { returnTo: '/create' } });
                  },
                }
              : undefined
          }
          options={{
            title: t(tab.label),
            tabBarIcon: ({ focused, size }) =>
              tab.name === 'compose' ? (
                <View
                  style={{
                    backgroundColor: colors.coral,
                    borderRadius: 14,
                    width: 42,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Ionicons name="add" color={colors.background} size={28} />
                </View>
              ) : (
                <Ionicons name={tab.icon} color={focused ? colors.coralInk : colors.textMuted} size={size} />
              ),
          }}
        />
      ))}
      <Tabs.Screen name="inbox" options={{ href: null }} />
    </Tabs>
  );
}
