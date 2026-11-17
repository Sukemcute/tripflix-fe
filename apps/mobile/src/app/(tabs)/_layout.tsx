import { t, type MessageKey } from '@tripflix/i18n';
import { Tabs, router } from 'expo-router';
import { useApiSession } from '@tripflix/api-client';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useUnreadNotificationCount } from '@/features/account/notification-bell';

// Mobile V1 design: creation is an action; notifications live behind the bell.
const TABS: readonly { name: string; label: MessageKey }[] = [
  { name: 'index', label: 'mobile.tabs.reels' },
  { name: 'explore', label: 'mobile.tabs.explore' },
  { name: 'compose', label: 'mobile.tabs.create' },
  { name: 'book', label: 'mobile.tabs.book' },
  { name: 'me', label: 'mobile.tabs.profile' },
];

export default function TabsLayout() {
  const { user, isReady } = useApiSession();
  // Chuông nằm ở Khám phá nên tab này mang số chưa đọc.
  const unreadCount = useUnreadNotificationCount();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
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
            ...(tab.name === 'explore' &&
              unreadCount > 0 && {
                tabBarBadge: unreadCount,
                tabBarAccessibilityLabel: `${t(tab.label)}, ${t('api.notificationsUnreadCount', { count: unreadCount })}`,
              }),
          }}
        />
      ))}
      <Tabs.Screen name="inbox" options={{ href: null }} />
    </Tabs>
  );
}
