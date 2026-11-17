'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
    const stream = new EventSource('/bff/api/admin/realtime');
    const connecting = () => setStatus(navigator.onLine ? 'connecting' : 'offline');
    stream.addEventListener('ready', () => {
      setStatus('live');
      reload();
    });
    stream.addEventListener('moderation.changed', reload);
    stream.addEventListener('reconnecting', connecting);
    stream.onerror = connecting;
    const reconnect = () => {
      connecting();
      reload();
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', connecting);
    return () => {
      stream.close();
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', connecting);
    };
  }, [enabled, client]);
  return status;
}
