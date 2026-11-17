import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getHttpConfig } from './http';
import { useApiSession } from './session';

/** Sự kiện notification-service phát khi có thông báo mới (README notification-service, TF46). */
export const NOTIFICATION_CREATED_EVENT = 'notification.created';
export const NOTIFICATION_READ_EVENT = 'notification.read';
const AUTH_EXPIRED_EVENT = 'auth.expired';

/** Chỉ giữ dạng cần dùng: socket.io-client gắn data của lỗi bắt tay vào Error. */
type HandshakeError = Error & { data?: { code?: string } };

// Người dùng đang có socket /ws kết nối; useNotifications dựa vào đây để bỏ polling khi đã có realtime.
let connectedUserId: string | null = null;
let commentsSocket: Socket | null = null;
export interface PostCommentsChange {
  postId: string;
  kind: 'created' | 'updated' | 'deleted' | 'hidden' | 'restored' | 'resync';
  parentCommentId?: string | null;
  commentId?: string;
  actorId?: string | null;
  changeCount?: number;
}
const postWatchers = new Map<string, Set<(changes: readonly PostCommentsChange[]) => void>>();
const postTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPostChanges = new Map<string, PostCommentsChange[]>();

function schedulePostCommentsReload(change: PostCommentsChange): void {
  const postId = change.postId;
  pendingPostChanges.set(postId, [...(pendingPostChanges.get(postId) ?? []), change]);
  if (postTimers.has(postId)) return;
  postTimers.set(postId, setTimeout(() => {
    postTimers.delete(postId);
    const changes = pendingPostChanges.get(postId) ?? [];
    pendingPostChanges.delete(postId);
    postWatchers.get(postId)?.forEach((onChange) => onChange(changes));
  }, 1000));
}

/** Dùng socket thông báo hiện có; nhiều bảng cùng bài chỉ chiếm một phòng. */
export function watchPostComments(postId: string, onChange: (changes: readonly PostCommentsChange[]) => void): () => void {
  let watchers = postWatchers.get(postId);
  if (!watchers) {
    watchers = new Set();
    postWatchers.set(postId, watchers);
    if (commentsSocket?.connected) commentsSocket.emit('post.watch', { postId });
  }
  watchers.add(onChange);
  return () => {
    watchers.delete(onChange);
    if (watchers.size) return;
    postWatchers.delete(postId);
    if (commentsSocket?.connected) commentsSocket.emit('post.unwatch', { postId });
    clearTimeout(postTimers.get(postId));
    postTimers.delete(postId);
    pendingPostChanges.delete(postId);
  };
}

/** Socket /ws của người dùng này đang kết nối thì thông báo mới tự đến, không cần poll. */
export function isNotificationsSocketConnected(userId: string | undefined): boolean {
  return !!userId && connectedUserId === userId;
}

/**
 * Mở kết nối WebSocket /ws khi đã đăng nhập, có thông báo mới thì tải lại danh sách ngay (không chờ lượt 30 giây).
 * Socket chỉ báo "có mới"; dữ liệu vẫn lấy qua GET /notifications, nên kết nối lại xong cũng tải lại để bù phần lỡ.
 * Token hết hạn hoặc bị từ chối lúc bắt tay thì làm mới token rồi nối lại; mất mạng thì socket.io tự nối lại.
 * `onNotificationCreated` nhận nguyên payload `notification.created` (đọc bằng `readCreatedNotification`), ví dụ để mobile hiện banner.
 */
export function useNotificationsRealtime(onNotificationCreated?: (payload: unknown) => void): void {
  const { user, isReady } = useApiSession();
  const queryClient = useQueryClient();
  const userId = user?.id;
  // Giữ hàm mới nhất trong ref để đổi callback không làm đóng mở lại socket.
  const onCreatedRef = useRef(onNotificationCreated);
  useEffect(() => {
    onCreatedRef.current = onNotificationCreated;
  });

  useEffect(() => {
    const { baseUrl } = getHttpConfig();
    if (!isReady || !userId || !baseUrl) return;
    const queryKey = ['notifications', userId];
    const reload = () => void queryClient.invalidateQueries({ queryKey });
    let isClosed = false;
    let refreshRetries = 0;

    const socket: Socket = io(baseUrl, {
      path: '/ws',
      transports: ['websocket'],
      // Hàm: mỗi lần nối lại đều lấy access token mới nhất.
      auth: (send) => {
        void Promise.resolve(getHttpConfig().getAccessToken?.() ?? null).then((token) => send({ token }));
      },
    });
    commentsSocket = socket;
    socket.on('post.comments.changed', (payload: unknown) => {
      if (!payload || typeof payload !== 'object' || !('postId' in payload)) return;
      if (typeof payload.postId === 'string' && postWatchers.has(payload.postId)) {
        const raw = payload as Record<string, unknown>;
        const changeCount = typeof raw.changeCount === 'number' && raw.changeCount > 0 ? raw.changeCount : 1;
        // Tín hiệu BE gom nhiều thay đổi chỉ mang actor cuối, không thể coi cả nhóm là của mình.
        if (raw.actorId === userId && changeCount === 1) return;
        const kind = ['created', 'updated', 'deleted', 'hidden', 'restored'].includes(String(raw.kind))
          ? raw.kind as PostCommentsChange['kind'] : 'resync';
        schedulePostCommentsReload({
          postId: payload.postId, kind: changeCount > 1 ? 'resync' : kind, changeCount,
          parentCommentId: typeof raw.parentCommentId === 'string' ? raw.parentCommentId : null,
          commentId: typeof raw.commentId === 'string' ? raw.commentId : undefined,
          actorId: typeof raw.actorId === 'string' ? raw.actorId : null,
        });
      }
    });

    const refreshAndReconnect = async () => {
      // Tối đa 3 lần liên tiếp để token hỏng không làm vòng lặp vô hạn; lần nối được thì đặt lại.
      if (refreshRetries >= 3) return;
      refreshRetries += 1;
      const isRefreshed = (await getHttpConfig().refreshAccessToken?.()) ?? false;
      if (isRefreshed && !isClosed) socket.connect();
    };

    socket.on('connect', () => {
      refreshRetries = 0;
      connectedUserId = userId;
      postWatchers.forEach((_, postId) => {
        socket.emit('post.watch', { postId });
        schedulePostCommentsReload({ postId, kind: 'resync' });
      });
      // Tải lại để bù phần lỡ; lượt tải này cũng tính lại refetchInterval nên polling tắt.
      reload();
    });
    socket.on('disconnect', () => {
      if (connectedUserId === userId) connectedUserId = null;
      // Tải lại để polling 30 giây bật lại trong lúc chờ socket nối lại.
      if (!isClosed) reload();
    });
    socket.on(NOTIFICATION_CREATED_EVENT, (payload: unknown) => {
      reload();
      onCreatedRef.current?.(payload);
    });
    socket.on(NOTIFICATION_READ_EVENT, reload);
    socket.on(AUTH_EXPIRED_EVENT, () => void refreshAndReconnect());
    socket.on('connect_error', (error: HandshakeError) => {
      // 'unavailable' (Redis, JWKS lỗi) để socket.io tự thử lại; 'unauthorized' thì phải có token mới.
      if (error.data?.code === 'unauthorized') void refreshAndReconnect();
    });

    return () => {
      isClosed = true;
      if (commentsSocket === socket) commentsSocket = null;
      postTimers.forEach(clearTimeout);
      postTimers.clear();
      pendingPostChanges.clear();
      if (connectedUserId === userId) connectedUserId = null;
      socket.disconnect();
    };
  }, [isReady, userId, queryClient]);
}
