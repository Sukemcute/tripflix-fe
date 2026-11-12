import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import {
  isNotificationsSocketConnected,
  NOTIFICATION_CREATED_EVENT,
  useNotificationsRealtime,
} from './notifications-realtime';

const invalidateQueries = vi.fn();
let cleanup: (() => void) | void;
let sessionState = { isReady: true, user: { id: 'u1' } as { id: string } | null };

vi.mock('react', () => ({ useEffect: (effect: () => (() => void) | void) => (cleanup = effect()) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries }) }));
vi.mock('./session', () => ({ useApiSession: () => sessionState }));

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Handler>();
const socket = {
  on: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
  connect: vi.fn(),
  disconnect: vi.fn(),
};
const io = vi.fn((..._args: unknown[]) => socket);
vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => io(...args) }));

const fire = (event: string, ...args: unknown[]) => handlers.get(event)?.(...args);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  handlers.clear();
  vi.clearAllMocks();
  sessionState = { isReady: true, user: { id: 'u1' } };
});
afterEach(() => cleanup?.());

describe('useNotificationsRealtime', () => {
  it('đã đăng nhập thì mở /ws qua gateway, chỉ dùng websocket, gửi access token lúc bắt tay', async () => {
    configureHttp({ baseUrl: 'https://gateway.example', getAccessToken: () => 'tok-1' });
    useNotificationsRealtime();
    const [url, options] = io.mock.calls[0] as [
      string,
      { path: string; transports: string[]; auth: (cb: (data: unknown) => void) => void },
    ];
    expect(url).toBe('https://gateway.example');
    expect(options).toMatchObject({ path: '/ws', transports: ['websocket'] });
    const send = vi.fn();
    options.auth(send);
    await flush();
    expect(send).toHaveBeenCalledWith({ token: 'tok-1' });
  });

  it('có thông báo mới hoặc vừa nối lại thì tải lại danh sách của đúng người dùng', () => {
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    fire(NOTIFICATION_CREATED_EVENT, { unreadCount: 1 });
    fire('connect');
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications', 'u1'] });
  });

  it('token bị từ chối hoặc hết hạn thì làm mới token rồi nối lại, tối đa 3 lần liên tiếp', async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue(true);
    configureHttp({ baseUrl: 'https://gateway.example', refreshAccessToken });
    useNotificationsRealtime();
    fire('auth.expired');
    await flush();
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) {
      fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unauthorized' } }));
      await flush();
    }
    expect(refreshAccessToken).toHaveBeenCalledTimes(3);
  });

  it('lỗi tạm thời (unavailable) để socket.io tự thử lại, không làm mới token', async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue(true);
    configureHttp({ baseUrl: 'https://gateway.example', refreshAccessToken });
    useNotificationsRealtime();
    fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unavailable' } }));
    await flush();
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('chưa đăng nhập thì không mở kết nối; rời trang thì ngắt', () => {
    configureHttp({ baseUrl: 'https://gateway.example' });
    sessionState = { isReady: true, user: null };
    useNotificationsRealtime();
    expect(io).not.toHaveBeenCalled();
    sessionState = { isReady: true, user: { id: 'u1' } };
    useNotificationsRealtime();
    cleanup?.();
    cleanup = undefined;
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ghi nhận trạng thái socket để useNotifications tắt polling, mất kết nối thì tải lại và bật lại', () => {
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    expect(isNotificationsSocketConnected('u1')).toBe(false);
    fire('connect');
    expect(isNotificationsSocketConnected('u1')).toBe(true);
    expect(isNotificationsSocketConnected('u2')).toBe(false);
    invalidateQueries.mockClear();
    fire('disconnect');
    expect(isNotificationsSocketConnected('u1')).toBe(false);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications', 'u1'] });
    fire('connect');
    cleanup?.();
    cleanup = undefined;
    expect(isNotificationsSocketConnected('u1')).toBe(false);
  });
});
