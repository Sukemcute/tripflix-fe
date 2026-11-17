import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import {
  isNotificationsSocketConnected,
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATION_READ_EVENT,
  useNotificationsRealtime,
  watchPostComments,
} from './notifications-realtime';

const invalidateQueries = vi.fn();
let cleanup: (() => void) | void;
let sessionState = { isReady: true, user: { id: 'u1' } as { id: string } | null };

vi.mock('react', () => ({
  useEffect: (effect: () => (() => void) | void) => (cleanup = effect()),
  useRef: <T>(current: T) => ({ current }),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries }) }));
vi.mock('./session', () => ({ useApiSession: () => sessionState }));

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Handler>();
const socket = {
  connected: true,
  emit: vi.fn(),
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
  it('bỏ tín hiệu của chính người xem trước khi gom; giữ đủ hai luồng khác nhau', () => {
    vi.useFakeTimers();
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    const onChange = vi.fn();
    const stop = watchPostComments('p1', onChange);
    fire('post.comments.changed', { postId: 'p1', kind: 'created', actorId: 'u1' });
    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();
    fire('post.comments.changed', { postId: 'p1', kind: 'created', parentCommentId: 'a', actorId: 'u2' });
    fire('post.comments.changed', { postId: 'p1', kind: 'created', parentCommentId: 'b', actorId: 'u3' });
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ parentCommentId: 'a', actorId: 'u2' }),
      expect.objectContaining({ parentCommentId: 'b', actorId: 'u3' }),
    ]);
    stop();
    vi.useRealTimers();
  });

  it('không bỏ cả nhóm coalesced chỉ vì actor cuối là chính mình', () => {
    vi.useFakeTimers();
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    const onChange = vi.fn();
    const stop = watchPostComments('p1', onChange);
    fire('post.comments.changed', { postId: 'p1', kind: 'created', actorId: 'u1', changeCount: 3 });
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ kind: 'resync' })]);
    stop();
    vi.useRealTimers();
  });
  it('vào phòng, lọc đúng bài, gom thay đổi mỗi giây và rời phòng khi đóng', () => {
    vi.useFakeTimers();
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    const onChange = vi.fn();
    const stop = watchPostComments('p1', onChange);
    expect(socket.emit).toHaveBeenCalledWith('post.watch', { postId: 'p1' });
    fire('post.comments.changed', { postId: 'p2' });
    fire('post.comments.changed', null);
    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();
    fire('post.comments.changed', { postId: 'p1' });
    fire('post.comments.changed', { postId: 'p1' });
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
    fire('connect');
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(2);
    fire('post.comments.changed', { postId: 'p1' });
    stop();
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenCalledWith('post.unwatch', { postId: 'p1' });
    vi.useRealTimers();
  });

  it('hai bảng cùng bài dùng chung phòng, đóng bảng cuối mới unwatch', () => {
    configureHttp({ baseUrl: 'https://gateway.example' });
    useNotificationsRealtime();
    const stopFirst = watchPostComments('p1', vi.fn());
    const stopSecond = watchPostComments('p1', vi.fn());
    expect(socket.emit).toHaveBeenCalledTimes(1);
    stopFirst();
    expect(socket.emit).toHaveBeenCalledTimes(1);
    stopSecond();
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });
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
    fire(NOTIFICATION_READ_EVENT, { unreadCount: 0 });
    fire('connect');
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications', 'u1'] });
  });

  it('có thông báo mới thì chuyển nguyên payload cho callback, ví dụ để mobile hiện banner', () => {
    configureHttp({ baseUrl: 'https://gateway.example' });
    const onCreated = vi.fn();
    useNotificationsRealtime(onCreated);
    fire(NOTIFICATION_CREATED_EVENT, { item: { id: 'n1' } });
    expect(onCreated).toHaveBeenCalledWith({ item: { id: 'n1' } });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
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
