import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureHttp } from '@tripflix/api-client';
import { colors } from '@tripflix/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

// Địa chỉ gateway lấy từ apps/mobile/.env. Token (expo-secure-store) gắn ở đây khi có task đăng nhập.
configureHttp({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080' });

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
