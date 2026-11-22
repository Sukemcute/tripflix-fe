import type { SessionState } from './session-client';

/** Phần trạng thái phiên quyết định cache React Query của người dùng nào đang hiện. */
export interface SessionCacheState {
  userId: string | null;
  isReady: boolean;
}

/**
 * - none: giữ nguyên cache.
 * - invalidate: giữ dữ liệu đang hiện, tải lại ngầm mọi query (khách vừa đăng nhập).
 * - clear: xoá sạch cache (đăng xuất, mất phiên, đổi tài khoản) để không lộ dữ liệu của người trước.
 */
export type SessionCacheAction = 'none' | 'invalidate' | 'clear';

export function readSessionCacheState(state: SessionState): SessionCacheState {
  return { userId: state.user?.id ?? null, isReady: state.isReady };
}

/**
 * Việc cần làm với cache khi trạng thái phiên đổi từ previous sang next.
 * Khôi phục phiên lúc mở app (chưa isReady, chưa có người dùng → A) không đụng cache: các query đã chạy trong
 * lúc chờ vẫn dùng được, xoá đi sẽ gọi lại lần hai và chớp trắng màn hình.
 */
export function decideCacheAction(previous: SessionCacheState, next: SessionCacheState): SessionCacheAction {
  if (previous.userId === next.userId) return 'none';
  if (previous.userId === null) return previous.isReady ? 'invalidate' : 'none';
  return 'clear';
}
