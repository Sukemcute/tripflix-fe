import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureHttp } from '@tripflix/api-client';
import { colors, mobileLayout } from '@tripflix/tokens';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { copy, Txt } from '@/components/mobile-ui';
import { ReviewProvider } from '@/features/review/review-provider';

// Địa chỉ gateway lấy từ apps/mobile/.env. Token (expo-secure-store) gắn ở đây khi có task đăng nhập.
configureHttp({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080' });
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  const [hasFonts, fontError] = useFonts({
    'BeVietnamPro-Regular': require('../../assets/brand/be-vietnam-pro-0.ttf'),
    'BeVietnamPro-Medium': require('../../assets/brand/be-vietnam-pro-1.ttf'),
    'BeVietnamPro-Semibold': require('../../assets/brand/be-vietnam-pro-2.ttf'),
    'BeVietnamPro-Bold': require('../../assets/brand/be-vietnam-pro-3.ttf'),
    'BeVietnamPro-ExtraBold': require('../../assets/brand/be-vietnam-pro-4.ttf'),
  });
  if (!hasFonts && !fontError)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.coral} accessibilityLabel={copy.common.loading} />
      </View>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <ReviewProvider>
        <StatusBar style="dark" />
        {fontError && <Txt variant="caption">{copy.common.fontError}</Txt>}
        <View
          style={{
            flex: 1,
            width: '100%',
            alignSelf: 'center',
            maxWidth: Platform.OS === 'web' ? mobileLayout.contentWidth : undefined,
          }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'none',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      </ReviewProvider>
    </QueryClientProvider>
  );
}
