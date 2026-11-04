'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureHttp } from '@tripflix/api-client';
import { useState, type ReactNode } from 'react';

// Địa chỉ gateway. Token, refresh sẽ gắn ở đây khi có task đăng nhập (module access).
configureHttp({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080' });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
