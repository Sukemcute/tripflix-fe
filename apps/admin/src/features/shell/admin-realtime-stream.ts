/** Luồng SSE realtime của admin: BFF giữ socket phía server, trình duyệt chỉ nhận tín hiệu. */
export const ADMIN_REALTIME_URL = '/bff/api/admin/realtime';
/** Chuyển trang thì trang cũ huỷ đăng ký trước khi trang mới đăng ký: chờ một chút rồi mới đóng. */
export const CLOSE_GRACE_MS = 10_000;

export interface AdminRealtimeListener {
  onReady: () => void;
  onChange: () => void;
  onReconnecting: () => void;
}

interface EventSourceLike {
  addEventListener(type: string, listener: () => void): void;
  onerror: ((event: Event) => unknown) | null;
  close(): void;
}

interface SharedStream {
  source: EventSourceLike;
  listeners: Set<AdminRealtimeListener>;
  isReady: boolean;
  closeTimer?: ReturnType<typeof setTimeout>;
}

let shared: SharedStream | null = null;

function broadcast(stream: SharedStream, pick: (listener: AdminRealtimeListener) => () => void) {
  for (const listener of [...stream.listeners]) pick(listener)();
}

/**
 * Mọi trang admin dùng chung một EventSource. Trước đây mỗi trang mở luồng riêng, nên mỗi lần chuyển trang
 * BFF phải đóng rồi mở lại socket tới gateway và có khoảng trống không nhận tín hiệu.
 */
export function subscribeAdminRealtime(
  listener: AdminRealtimeListener,
  createSource: (url: string) => EventSourceLike = (url) => new EventSource(url),
): () => void {
  if (!shared) {
    const stream: SharedStream = { source: createSource(ADMIN_REALTIME_URL), listeners: new Set(), isReady: false };
    stream.source.addEventListener('ready', () => {
      stream.isReady = true;
      broadcast(stream, (item) => item.onReady);
    });
    stream.source.addEventListener('moderation.changed', () => broadcast(stream, (item) => item.onChange));
    const reconnecting = () => {
      stream.isReady = false;
      broadcast(stream, (item) => item.onReconnecting);
    };
    stream.source.addEventListener('reconnecting', reconnecting);
    stream.source.onerror = reconnecting;
    shared = stream;
  }
  const stream = shared;
  if (stream.closeTimer) clearTimeout(stream.closeTimer);
  stream.closeTimer = undefined;
  stream.listeners.add(listener);
  // Trang mở sau khi luồng đã sẵn sàng thì báo ngay, không chờ sự kiện ready lần nữa.
  if (stream.isReady) listener.onReady();

  return () => {
    stream.listeners.delete(listener);
    if (stream.listeners.size || shared !== stream) return;
    stream.closeTimer = setTimeout(() => {
      if (stream.listeners.size) return;
      stream.source.close();
      if (shared === stream) shared = null;
    }, CLOSE_GRACE_MS);
  };
}
