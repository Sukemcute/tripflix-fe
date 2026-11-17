import { t, type MessageKey } from '@tripflix/i18n';
import { Redirect, Tabs, router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useApiSession } from '@tripflix/api-client';
import { useState } from 'react';
import { View } from 'react-native';
import { InsideTabBarContext, Txt } from '@/components/mobile-ui';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useUnreadNotificationCount } from '@/features/account/notification-bell';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { shouldOfferOnboarding } from '@/features/onboarding/onboarding-model';

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
  const { record, ready } = useOnboarding();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  if (!ready || !isReady)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDFA' }}>
        <Txt>Đang mở hành trình…</Txt>
      </View>
    );
  return (
    <ReadyTabs
      offerOnEntry={!user && shouldOfferOnboarding(record, pathname, Object.keys(params).length > 0)}
    />
  );
}

function ReadyTabs({ offerOnEntry }: { offerOnEntry: boolean }) {
  const { user, isReady } = useApiSession();
  // Decide once after hydration. Editing a draft later must not interrupt the active tab.
  const [offer] = useState(offerOnEntry);
  const unreadCount = useUnreadNotificationCount();
  if (offer) return <Redirect href="/onboarding" />;
  return (
    <InsideTabBarContext.Provider value>
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
    </InsideTabBarContext.Provider>
  );
}
