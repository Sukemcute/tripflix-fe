'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  readCreatedNotification,
  useApiSession,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsRealtime,
  webPushApi,
  type InboxNotification,
} from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AvatarPhoto } from '../shared/avatar-photo';
import { resolveNotificationHref } from './notification-href';
import { observeNotificationTitle } from './notification-title';
import { createNotificationArrivals } from './notification-arrivals';
import { inactiveWindowSnapshot, isWindowVisible, subscribeWindowActivity } from './window-activity';
import { createTripiSoundPlayer } from './notification-sound';
import './web-notifications.css';

interface PushControl {
  enable: () => void;
  status: string;
  isBusy: boolean;
}
const PushContext = createContext<PushControl | null>(null);

function workerMessage(worker: ServiceWorker, message: unknown): Promise<{ presentation?: string }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error('Worker timeout'));
    }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data?.ok)
        resolve({
          presentation: typeof event.data.presentation === 'string' ? event.data.presentation : undefined,
        });
      else reject(new Error('Worker unavailable'));
    };
    worker.postMessage(message, [channel.port2]);
  });
}

let workerRegistration: Promise<ServiceWorkerRegistration> | undefined;
function notificationWorker(): Promise<ServiceWorkerRegistration> {
  workerRegistration ??= navigator.serviceWorker
    .register('/notification-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    .then((registration) => (registration.active ? registration : navigator.serviceWorker.ready))
    .catch((error: unknown) => {
      workerRegistration = undefined;
      throw error;
    });
  return workerRegistration;
}

function safeHref(item: InboxNotification): string {
  const href = resolveNotificationHref(item);
  try {
    const url = new URL(href ?? '/', window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : '/';
  } catch {
    return '/';
  }
}

export function WebNotifications({ children }: { children: ReactNode }) {
  const { user, isReady, session } = useApiSession();
  const userId = user?.id;
  const isVisible = useSyncExternalStore(subscribeWindowActivity, isWindowVisible, inactiveWindowSnapshot);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [soundPlayer] = useState(() =>
    createTripiSoundPlayer({
      onBlocked: () => setSoundBlocked(true),
      onReady: () => setSoundBlocked(false),
    }),
  );
  const currentUser = useRef(userId);
  useEffect(() => {
    currentUser.current = userId;
  }, [userId]);
  const previousUser = useRef<string | undefined>(undefined);
  const observedUser = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: markRead } = useMarkNotificationRead();
  const notifications = useNotifications();
  const unread = userId ? (notifications.data?.pages[0]?.unreadCount ?? 0) : 0;
  const [toasts, setToasts] = useState<{ userId: string; item: InboxNotification; expires: number }[]>([]);
  const [status, setStatus] = useState('unavailable');
  const [isBusy, setBusy] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const fallbackSeen = useRef(new Set<string>());
  const arrivals = useRef(createNotificationArrivals());
  const showToast = useCallback(
    (id: string, item: InboxNotification) => {
      if (currentUser.current !== id) return;
      // Âm luôn bật; người dùng muốn im thì tắt loa máy hoặc tắt tiếng tab.
      void soundPlayer.notify(`${id}:${item.id}`, { enabled: true });
      setToasts((items) =>
        [
          ...items.filter((entry) => entry.userId === id && entry.item.id !== item.id),
          { userId: id, item, expires: Date.now() + 6000 },
        ].slice(-3),
      );
    },
    [soundPlayer],
  );

  useEffect(() => () => soundPlayer.reset(), [soundPlayer]);
  useEffect(() => {
    const unlock = (event: Event) => {
      if (event.isTrusted) void soundPlayer.prime();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  }, [soundPlayer]);

  const bind = useCallback(async (id: string, shouldSubscribe: boolean) => {
    const registration = await notificationWorker();
    if (!registration.active || currentUser.current !== id) return;
    await workerMessage(registration.active, { type: 'NOTIFICATION_OWNER', userId: id });
    if (!('Notification' in window) || !('PushManager' in window)) {
      await workerMessage(registration.active, { type: 'NOTIFICATION_DRAIN', userId: id });
      return;
    }
    // Hỏi server trước khi hiện nút: server chưa bật Web Push thì ẩn hẳn, không mời bấm rồi báo lỗi.
    const config = await webPushApi.configuration().catch(() => null);
    if (!config?.enabled || !config.publicKey) {
      setStatus(config ? 'disabled' : 'error');
      await workerMessage(registration.active, { type: 'NOTIFICATION_DRAIN', userId: id });
      return;
    }
    if (Notification.permission === 'granted') {
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription && shouldSubscribe) {
        const binary = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'));
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
        });
      }
      if (subscription && currentUser.current === id) {
        const result = await webPushApi.register(subscription.toJSON());
        if (currentUser.current !== id) return;
        await workerMessage(registration.active, {
          type: 'NOTIFICATION_OWNER',
          userId: id,
          subscriptionId: result.id,
        });
        setStatus('enabled');
      } else setStatus('default');
    } else setStatus(Notification.permission);
    await workerMessage(registration.active, { type: 'NOTIFICATION_DRAIN', userId: id });
  }, []);

  useEffect(() => observeNotificationTitle(unread), [unread]);

  useEffect(() => {
    observedUser.current = session.getSnapshot().user?.id;
    return session.subscribe(() => {
      const next = session.getSnapshot().user?.id;
      if (observedUser.current !== next) {
        setToasts([]);
        fallbackSeen.current.clear();
        soundPlayer.clearNotifications();
      }
      observedUser.current = next;
    });
  }, [session, soundPlayer]);

  useEffect(() => {
    if (!isReady || !('serviceWorker' in navigator)) return;
    const oldUser = previousUser.current;
    previousUser.current = userId;
    if (oldUser && oldUser !== userId) {
      void notificationWorker()
        .then(async (registration) => {
          if (registration.active)
            await workerMessage(registration.active, { type: 'NOTIFICATION_LOGOUT', userId: oldUser });
        })
        .then(() => {
          if (userId && currentUser.current === userId) return bind(userId, false);
        })
        .catch(() => setStatus('error'));
    } else if (userId)
      void notificationWorker()
        .then(() => bind(userId, false))
        .catch(() => setStatus('error'));
    else
      void notificationWorker()
        .then(async (registration) => {
          if (registration.active && !currentUser.current)
            await workerMessage(registration.active, { type: 'NOTIFICATION_LOGOUT' });
        })
        .catch(() => setStatus('error'));
  }, [userId, isReady, bind]);

  useEffect(() => {
    if (!userId) return;
    const renew = () => {
      if (currentUser.current !== userId) return;
      // Job fan-out hiện ghi inbox theo lô và không phát socket; kiểm tra để bù các mục đó.
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      if ('serviceWorker' in navigator) void bind(userId, false).catch(() => setStatus('error'));
    };
    const timer = setInterval(renew, 60_000);
    window.addEventListener('focus', renew);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', renew);
    };
  }, [userId, bind, queryClient]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(
      () => setToasts((items) => items.filter((entry) => entry.expires > Date.now())),
      Math.max(0, Math.min(...toasts.map((entry) => entry.expires)) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (!userId) return;
    const reload = () => void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    const broadcast = 'BroadcastChannel' in window ? new BroadcastChannel(`tripflix-inbox:${userId}`) : null;
    channel.current = broadcast;
    if (broadcast) broadcast.onmessage = reload;
    if (!('serviceWorker' in navigator))
      return () => {
        broadcast?.close();
        channel.current = null;
      };
    const receive = (event: MessageEvent) => {
      const message = event.data;
      if (message?.userId !== currentUser.current) return;
      if (message.type === 'NOTIFICATION_INVALIDATE') reload();
      if (message.type === 'NOTIFICATION_TOAST') {
        const item = readCreatedNotification({ item: message.item });
        if (item) showToast(userId, item);
      }
      if (message.type === 'NOTIFICATION_CLICK' && typeof message.id === 'string') {
        const target = new URL(String(message.href ?? '/'), window.location.origin);
        if (target.origin !== window.location.origin) return;
        markRead(message.id, { onSuccess: () => broadcast?.postMessage('read') });
        router.push(target.pathname + target.search + target.hash);
      }
    };
    navigator.serviceWorker.addEventListener('message', receive);
    return () => {
      broadcast?.close();
      channel.current = null;
      navigator.serviceWorker.removeEventListener('message', receive);
    };
  }, [userId, queryClient, router, markRead, showToast]);

  const present = useCallback(
    (id: string, item: InboxNotification) => {
      if (currentUser.current !== id || item.readAt || document.visibilityState !== 'visible') return;
      const fallback = () => {
        const key = `${id}:${item.id}`;
        if (fallbackSeen.current.has(key)) return;
        fallbackSeen.current.add(key);
        if (fallbackSeen.current.size > 200)
          fallbackSeen.current.delete(fallbackSeen.current.values().next().value!);
        showToast(id, item);
      };
      if ('serviceWorker' in navigator) {
        void notificationWorker()
          .then(
            (registration) =>
              registration.active &&
              workerMessage(registration.active, {
                type: 'NOTIFICATION_PRESENT',
                userId: id,
                item,
                href: safeHref(item),
              }),
          )
          .then((reply) => {
            if (reply && reply.presentation === 'deferred') arrivals.current.defer(id, item.id);
          })
          .catch(fallback);
      } else fallback();
    },
    [showToast],
  );

  useNotificationsRealtime((payload) => {
    const item = readCreatedNotification(payload);
    if (!item || !userId) return;
    // Cửa sổ bị che (vd. đang bình luận ở trình duyệt khác) vẫn kêu ngay; thẻ chờ quay lại, cùng key nên không kêu lại.
    if (document.visibilityState !== 'visible')
      void soundPlayer.notify(`${userId}:${item.id}`, { enabled: true });
    present(userId, item);
  });

  useEffect(() => {
    if (userId && !notifications.isSuccess) return;
    const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
    const fresh = arrivals.current(userId, items, Date.now(), {
      canPresent: isVisible && !notifications.isFetching,
    });
    if (userId)
      fresh
        .slice(0, 3)
        .reverse()
        .forEach((item) => present(userId, item));
  }, [userId, notifications.data, notifications.isSuccess, notifications.isFetching, present, isVisible]);

  const enable = () => {
    if (!userId || isBusy) return;
    setBusy(true);
    // Gọi xin quyền trực tiếp từ thao tác của người dùng, trước mọi await khác.
    void Notification.requestPermission()
      .then(async (permission) => {
        setStatus(permission);
        if (permission === 'granted') await bind(userId, true);
      })
      .catch(() => setStatus('error'))
      .finally(() => setBusy(false));
  };

  return (
    <PushContext.Provider
      value={{
        enable,
        status,
        isBusy,
      }}
    >
      {children}
      <section className="notification-toasts" aria-label={vi.api.notificationsTitle} aria-live="polite">
        {soundBlocked && toasts.some((entry) => entry.userId === userId) && (
          <output className="notification-sound-notice">
            <span>{vi.api.notificationsSoundNeedsActivation}</span>
            <button
              type="button"
              onClick={() => {
                void soundPlayer.preview();
              }}
            >
              {vi.api.notificationsSoundActivate}
            </button>
          </output>
        )}
        {toasts
          .filter((entry) => entry.userId === userId)
          .map(({ item }) => {
            const actors = item.data.actorIds;
            const actorId =
              Array.isArray(actors) && typeof actors.at(-1) === 'string' ? String(actors.at(-1)) : null;
            return (
              <article className="notification-toast" key={item.id}>
                <button
                  type="button"
                  className="notification-toast-content"
                  onClick={() => {
                    markRead(item.id, { onSuccess: () => channel.current?.postMessage('read') });
                    setToasts((items) => items.filter((entry) => entry.item.id !== item.id));
                    router.push(safeHref(item));
                  }}
                >
                  <span className="notification-toast-avatar">
                    {actorId ? <AvatarPhoto userId={actorId} /> : 'T'}
                  </span>
                  <span>
                    <small>{vi.api.notificationsJustNow}</small>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="notification-toast-close"
                  aria-label={vi.api.notificationsDismiss}
                  onClick={() => setToasts((items) => items.filter((entry) => entry.item.id !== item.id))}
                >
                  ×
                </button>
              </article>
            );
          })}
      </section>
    </PushContext.Provider>
  );
}

export function EnableWebNotifications() {
  const control = useContext(PushContext);
  // Chưa bật thì luôn có nút để người dùng biết chỗ bật; đã bật thì ẩn.
  if (!control || control.status === 'unavailable' || control.status === 'enabled') return null;
  return (
    <div className="notification-push-control">
      <button type="button" disabled={control.isBusy} onClick={control.enable}>
        {vi.api.notificationsEnable}
      </button>
    </div>
  );
}
