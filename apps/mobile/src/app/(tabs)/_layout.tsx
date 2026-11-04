import Ionicons from '@expo/vector-icons/Ionicons';
import { t, type MessageKey } from '@tripflix/i18n';
import { colors } from '@tripflix/tokens';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

// 5 tab theo docs/11 §4: feed, explore, trips, inbox, me.
const TABS: readonly { name: string; label: MessageKey; icon: IconName }[] = [
  { name: 'index', label: 'tabs.feed', icon: 'play-circle' },
  { name: 'explore', label: 'tabs.explore', icon: 'compass' },
  { name: 'trips', label: 'tabs.trips', icon: 'map' },
  { name: 'inbox', label: 'tabs.inbox', icon: 'chatbubbles' },
  { name: 'me', label: 'tabs.me', icon: 'person-circle' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
