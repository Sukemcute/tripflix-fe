/** Luồng SSE realtime của admin: BFF giữ socket phía server, trình duyệt chỉ nhận tín hiệu. */
export const ADMIN_REALTIME_URL = '/bff/api/admin/realtime';
/** Chuyển trang thì trang cũ huỷ đăng ký trước khi trang mới đăng ký: chờ một chút rồi mới đóng. */
export const CLOSE_GRACE_MS = 10_000;
/** Luồng bị đóng hẳn (BFF trả 401 khi access token hết hạn sau 15 phút): chờ chừng này rồi làm mới phiên, mở lại. */
export const REOPEN_DELAY_MS = 3_000;
/** EventSource.CLOSED: trình duyệt không tự nối lại nữa. */
const CLOSED = 2;

export interface AdminRealtimeListener {
  onReady: () => void;
  onChange: () => void;
  onReconnecting: () => void;
}

interface EventSourceLike {
  readonly readyState: number;
  addEventListener(type: string, listener: () => void): void;
  onerror: ((event: Event) => unknown) | null;
  close(): void;
}

interface SharedStream {
  source: EventSourceLike;
  listeners: Set<AdminRealtimeListener>;
  isReady: boolean;
  closeTimer?: ReturnType<typeof setTimeout>;
  reopenTimer?: ReturnType<typeof setTimeout>;
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
  /** Làm mới access token trước khi mở lại luồng đã bị đóng; trả false (hết phiên) thì thôi mở lại. */
  refreshSession: () => Promise<boolean> = () => Promise.resolve(true),
): () => void {
  if (!shared) {
    const stream = { listeners: new Set(), isReady: false } as unknown as SharedStream;
    openSource(stream, createSource, refreshSession);
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
      if (stream.reopenTimer) clearTimeout(stream.reopenTimer);
      stream.source.close();
      if (shared === stream) shared = null;
    }, CLOSE_GRACE_MS);
  };
}

function openSource(stream: SharedStream, createSource: (url: string) => EventSourceLike, refreshSession: () => Promise<boolean>) {
  const source = createSource(ADMIN_REALTIME_URL);
  stream.source = source;
  source.addEventListener('ready', () => {
    stream.isReady = true;
    broadcast(stream, (item) => item.onReady);
  });
  source.addEventListener('moderation.changed', () => broadcast(stream, (item) => item.onChange));
  const reconnecting = () => {
    stream.isReady = false;
    broadcast(stream, (item) => item.onReconnecting);
  };
  source.addEventListener('reconnecting', reconnecting);
  source.onerror = () => {
    reconnecting();
    // Mạng rớt thì EventSource tự nối lại; BFF trả lỗi (401) thì trình duyệt đóng hẳn và không thử lại tới khi F5.
    if (source.readyState !== CLOSED || stream.reopenTimer) return;
    stream.reopenTimer = setTimeout(() => {
      stream.reopenTimer = undefined;
      void refreshSession()
        .catch(() => false)
        .then((isRefreshed) => {
          if (isRefreshed && shared === stream && stream.source === source) openSource(stream, createSource, refreshSession);
        });
    }, REOPEN_DELAY_MS);
  };
}
