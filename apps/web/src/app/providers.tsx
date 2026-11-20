'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiSessionProvider } from '@tripflix/api-client';
import { useState, type ReactNode } from 'react';
import { SurveyLogoutCleanup } from '@/features/onboarding/survey-logout-cleanup';
import { AssistantProvider } from '@/features/assistant/assistant-provider';
import { assistantTransport } from '@/features/assistant/assistant-transport';
import { AssistantWidget } from '@/features/assistant/assistant-widget';
import { WebNotifications } from '@/features/notifications/web-notifications';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiSessionProvider baseUrl={process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'} client="web">
        <WebNotifications>
          <SurveyLogoutCleanup />
          {/* Trợ lý Tripi (TF31) ở gốc để cuộc trò chuyện còn nguyên khi đổi trang hay đăng nhập giữa chừng. */}
          <AssistantProvider transport={assistantTransport}>
            {children}
            <AssistantWidget />
          </AssistantProvider>
        </WebNotifications>
      </ApiSessionProvider>
    </QueryClientProvider>
  );
}
