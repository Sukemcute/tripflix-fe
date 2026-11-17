import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { httpRaw } from './http';
import { useApiSession } from './session';

/** notification-service phát vào phòng staff khi hàng chờ kiểm duyệt đổi (TF104). */
export const STAFF_MODERATION_CHANGED_EVENT = 'admin.moderation.changed';
/** BFF admin cấp access token ngắn hạn cho socket; token không đi qua JS ở chỗ khác. */
export const STAFF_REALTIME_TOKEN_PATH = '/api/admin/realtime-token';
const AUTH_EXPIRED_EVENT = 'auth.expired';
const MAX_TOKEN_RETRIES = 3;

export type StaffModerationChangeKind = 'case' | 'decision' | 'report' | 'appeal' | 'scan';
export type StaffRealtimeStatus = 'idle' | 'connecting' | 'live' | 'offline';

export interface StaffModerationSignal {
  kinds: StaffModerationChangeKind[];
  changeCount: number;
  at: string;
}

type HandshakeError = Error & { data?: { code?: string } };

export interface StaffRealtimeOptions {
  socketUrl: string;
  getToken: () => Promise<string | null>;
  onStatus: (status: StaffRealtimeStatus) => void;
  onSignal: (signal: StaffModerationSignal) => void;
  /** Gọi khi vừa nối lại, để tải lại phần đã lỡ lúc mất kết nối. */
  onReconnect: () => void;
}

/** Đọc tín hiệu từ socket: dữ liệu ngoài hệ thống nên kiểm hình dạng trước khi dùng. */
export function readStaffSignal(value: unknown): StaffModerationSignal | null {
  if (!value || typeof value !== 'object') return null;
  const { kinds, changeCount, at } = value as Record<string, unknown>;
  if (!Array.isArray(kinds) || typeof changeCount !== 'number' || typeof at !== 'string') return null;
  const allowed = new Set<StaffModerationChangeKind>(['case', 'decision', 'report', 'appeal', 'scan']);
  return {
    kinds: kinds.filter((kind): kind is StaffModerationChangeKind => allowed.has(kind as StaffModerationChangeKind)),
    changeCount,
    at,
  };
}

/**
 * Kết nối /ws của staff. Lấy token từ BFF mỗi lần bắt tay; token hết hạn thì lấy lại và nối lại
 * (tối đa 3 lần liên tiếp để token hỏng không gây vòng lặp). Mất mạng thì socket.io tự nối lại.
 */
export class StaffRealtimeConnection {
  private socket: Socket | undefined;
  private tokenRetries = 0;
  private isClosed = false;

  constructor(private readonly options: StaffRealtimeOptions) {}

  start(): void {
    const { socketUrl, getToken, onStatus, onSignal, onReconnect } = this.options;
    onStatus('connecting');
    const socket = io(socketUrl, {
      path: '/ws',
      transports: ['websocket'],
      auth: (send) => {
        void getToken()
          .catch(() => null)
          .then((token) => send({ token }));
      },
    });
    this.socket = socket;
    let hasConnected = false;

    socket.on('connect', () => {
      this.tokenRetries = 0;
      onStatus('live');
      if (hasConnected) onReconnect();
      hasConnected = true;
    });
    socket.on('disconnect', () => {
      if (!this.isClosed) onStatus('offline');
    });
    socket.on(STAFF_MODERATION_CHANGED_EVENT, (payload: unknown) => {
      const signal = readStaffSignal(payload);
      if (signal) onSignal(signal);
    });
    socket.on(AUTH_EXPIRED_EVENT, () => this.reconnectWithNewToken());
    socket.on('connect_error', (error: HandshakeError) => {
      onStatus('offline');
      if (error.data?.code === 'unauthorized') this.reconnectWithNewToken();
    });
  }

  stop(): void {
    this.isClosed = true;
    this.socket?.disconnect();
    this.socket = undefined;
  }

  private reconnectWithNewToken(): void {
    if (this.isClosed || this.tokenRetries >= MAX_TOKEN_RETRIES) return;
    this.tokenRetries += 1;
    this.socket?.connect();
  }
}

/** Lấy access token ngắn hạn cho socket qua BFF; 401 thì httpRaw tự làm mới phiên rồi thử lại. */
export async function fetchStaffRealtimeToken(): Promise<string | null> {
  const response = await httpRaw(STAFF_REALTIME_TOKEN_PATH);
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { accessToken?: unknown } | null;
  return typeof body?.accessToken === 'string' ? body.accessToken : null;
}

export interface StaffRealtimeState {
  status: StaffRealtimeStatus;
  lastSignal: StaffModerationSignal | null;
}

/**
 * Admin mở socket staff khi người dùng là moderator/superadmin. Có tín hiệu thì tải lại mọi query kiểm duyệt;
 * socket chỉ báo "có đổi", dữ liệu vẫn lấy qua API. `socketUrl` rỗng thì không kết nối (admin dùng polling).
 */
export function useStaffRealtime(socketUrl: string | undefined): StaffRealtimeState {
  const { user, isReady } = useApiSession();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StaffRealtimeStatus>('idle');
  const [lastSignal, setLastSignal] = useState<StaffModerationSignal | null>(null);
  const isStaff = user?.role === 'moderator' || user?.role === 'superadmin';
  const isEnabled = isReady && isStaff && !!socketUrl;

  useEffect(() => {
    if (!isEnabled) return;
    const reload = () => {
      void queryClient.invalidateQueries({ queryKey: ['moderation'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    };
    const connection = new StaffRealtimeConnection({
      socketUrl,
      getToken: fetchStaffRealtimeToken,
      onStatus: setStatus,
      onSignal: (signal) => {
        setLastSignal(signal);
        reload();
      },
      onReconnect: reload,
    });
    connection.start();
    return () => connection.stop();
  }, [isEnabled, socketUrl, queryClient]);

  // Không kết nối (chưa đăng nhập, không phải staff, không có URL) thì báo idle; admin tự dùng polling.
  return { status: isEnabled ? status : 'idle', lastSignal };
}
