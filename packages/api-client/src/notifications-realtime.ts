import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getHttpConfig } from './http';
import { useApiSession } from './session';

/** Sự kiện notification-service phát khi có thông báo mới (README notification-service, TF46). */
export const NOTIFICATION_CREATED_EVENT = 'notification.created';
const AUTH_EXPIRED_EVENT = 'auth.expired';

/** Chỉ giữ dạng cần dùng: socket.io-client gắn data của lỗi bắt tay vào Error. */
type HandshakeError = Error & { data?: { code?: string } };

// Người dùng đang có socket /ws kết nối; useNotifications dựa vào đây để bỏ polling khi đã có realtime.
let connectedUserId: string | null = null;

/** Socket /ws của người dùng này đang kết nối thì thông báo mới tự đến, không cần poll. */
export function isNotificationsSocketConnected(userId: string | undefined): boolean {
  return !!userId && connectedUserId === userId;
}

/**
 * Mở kết nối WebSocket /ws khi đã đăng nhập, có thông báo mới thì tải lại danh sách ngay (không chờ lượt 30 giây).
 * Socket chỉ báo "có mới"; dữ liệu vẫn lấy qua GET /notifications, nên kết nối lại xong cũng tải lại để bù phần lỡ.
 * Token hết hạn hoặc bị từ chối lúc bắt tay thì làm mới token rồi nối lại; mất mạng thì socket.io tự nối lại.
 */
export function useNotificationsRealtime(): void {
  const { user, isReady } = useApiSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

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
      // Tải lại để bù phần lỡ; lượt tải này cũng tính lại refetchInterval nên polling tắt.
      reload();
    });
    socket.on('disconnect', () => {
      if (connectedUserId === userId) connectedUserId = null;
      // Tải lại để polling 30 giây bật lại trong lúc chờ socket nối lại.
      if (!isClosed) reload();
    });
    socket.on(NOTIFICATION_CREATED_EVENT, reload);
    socket.on(AUTH_EXPIRED_EVENT, () => void refreshAndReconnect());
    socket.on('connect_error', (error: HandshakeError) => {
      // 'unavailable' (Redis, JWKS lỗi) để socket.io tự thử lại; 'unauthorized' thì phải có token mới.
      if (error.data?.code === 'unauthorized') void refreshAndReconnect();
    });

    return () => {
      isClosed = true;
      if (connectedUserId === userId) connectedUserId = null;
      socket.disconnect();
    };
  }, [isReady, userId, queryClient]);
}
