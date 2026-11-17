'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeAdminRealtime } from './admin-realtime-stream';

export function useAdminRealtime(enabled: boolean) {
  const client = useQueryClient();
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        for (const queryKey of [['moderation'], ['admin-posts'], ['social']])
          void client.invalidateQueries({ queryKey });
      }, 250);
    };
    const connecting = () => setStatus(navigator.onLine ? 'connecting' : 'offline');
    // Dùng chung một luồng cho mọi trang để chuyển trang không phải nối lại (TF104).
    const unsubscribe = subscribeAdminRealtime({
      onReady: () => {
        setStatus('live');
        reload();
      },
      onChange: reload,
      onReconnecting: connecting,
    });
    const reconnect = () => {
      connecting();
      reload();
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', connecting);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', connecting);
    };
  }, [enabled, client]);
  return status;
}
