'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiSessionProvider } from '@tripflix/api-client';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/features/shared/theme-context';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiSessionProvider baseUrl={process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'} client="web">
        <ThemeProvider>{children}</ThemeProvider>
      </ApiSessionProvider>
    </QueryClientProvider>
  );
}
