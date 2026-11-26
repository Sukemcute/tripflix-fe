import { t, type MessageKey } from '@tripflix/i18n';
import { explorer } from '@tripflix/tokens';
import { Redirect, Tabs, router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useApiSession } from '@tripflix/api-client';
import { useState } from 'react';
import { InsideTabBarContext } from '@/components/mobile-ui';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useUnreadNotificationCount } from '@/features/account/notification-bell';
import { TripiLoadingScreen } from '@/features/mascot/tripi-loading-screen';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { needsAccountOnboarding, shouldOfferOnboarding } from '@/features/onboarding/onboarding-model';

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
  const { record, ready, dismissedAccount } = useOnboarding();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  if (!ready || !isReady) return <TripiLoadingScreen />;
  return (
    <ReadyTabs
      offerOnEntry={
        user
          ? needsAccountOnboarding(user) &&
            dismissedAccount !== user.id &&
            pathname === '/' &&
            Object.keys(params).length === 0
          : shouldOfferOnboarding(record, pathname, Object.keys(params).length > 0)
      }
    />
  );
}

function ReadyTabs({ offerOnEntry }: { offerOnEntry: boolean }) {
  const { user, isReady } = useApiSession();
  // Decide once after hydration. Editing a draft later must not interrupt the active tab.
  const [offer] = useState(offerOnEntry);
  const unreadCount = useUnreadNotificationCount();
  if (offer)
    return (
      <Redirect
        href={
          user
            ? { pathname: '/onboarding', params: { source: 'account', returnTo: '/(tabs)' } }
            : '/onboarding'
        }
      />
    );
  return (
    <InsideTabBarContext.Provider value>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'none',
          sceneStyle: { backgroundColor: explorer.day.surface },
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
              // Badge chưa đọc đặt ở Tôi: thông báo thuộc về tài khoản, tab Khám phá không có thông báo nào.
              ...(tab.name === 'me' &&
                unreadCount > 0 && {
                  tabBarBadge: unreadCount,
                  tabBarAccessibilityLabel: `${t(tab.label)}, ${t('api.notificationsUnreadCount', { count: unreadCount })}`,
                }),
            }}
          />
        ))}
        <Tabs.Screen name="inbox" options={{ href: null }} />
      </Tabs>
    </InsideTabBarContext.Provider>
  );
}
