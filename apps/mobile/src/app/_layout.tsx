import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiSessionProvider } from '@tripflix/api-client';
import * as SecureStore from 'expo-secure-store';
import { colors, mobileLayout } from '@tripflix/tokens';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AppFrame } from '@/components/app-frame';
import { copy, Txt } from '@/components/mobile-ui';
import { ReviewProvider } from '@/features/review/review-provider';
import { CommerceProvider } from '@/features/booking/commerce-provider';

const tokenStorage =
  Platform.OS === 'web'
    ? undefined
    : {
        read: () => SecureStore.getItemAsync('tripflix.refresh'),
        write: (token: string) => SecureStore.setItemAsync('tripflix.refresh', token),
        clear: () => SecureStore.deleteItemAsync('tripflix.refresh'),
      };
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
      <ApiSessionProvider
        baseUrl={
          process.env.EXPO_PUBLIC_API_URL ??
          (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080')
        }
        client={Platform.OS === 'web' ? 'web' : 'native'}
        storage={tokenStorage}
      >
        <CommerceProvider>
          <ReviewProvider>
            <StatusBar style="dark" />
            {fontError && <Txt variant="caption">{copy.common.fontError}</Txt>}
            <AppFrame
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
            </AppFrame>
          </ReviewProvider>
        </CommerceProvider>
      </ApiSessionProvider>
    </QueryClientProvider>
  );
}
