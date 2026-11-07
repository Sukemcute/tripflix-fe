'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiSessionProvider } from '@tripflix/api-client';
import { useState, type ReactNode } from 'react';

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('trycloudflare.com')) {
    return 'https://tenant-nursing-safari-supporters.trycloudflare.com';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiSessionProvider baseUrl={resolveApiBaseUrl()} client="web">
        {children}
      </ApiSessionProvider>
    </QueryClientProvider>
  );
}
