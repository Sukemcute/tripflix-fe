import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import {
  STAFF_MODERATION_CHANGED_EVENT,
  STAFF_REALTIME_TOKEN_PATH,
  StaffRealtimeConnection,
  fetchStaffRealtimeToken,
  type StaffRealtimeOptions,
} from './staff-realtime';

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

function connect(overrides: Partial<StaffRealtimeOptions> = {}) {
  const options = {
    socketUrl: 'https://gateway.example',
    getToken: vi.fn(async () => 'staff-token'),
    onStatus: vi.fn(),
    onSignal: vi.fn(),
    onReconnect: vi.fn(),
    ...overrides,
  };
  const connection = new StaffRealtimeConnection(options);
  connection.start();
  return { connection, options };
}

beforeEach(() => {
  handlers.clear();
  vi.clearAllMocks();
});

describe('StaffRealtimeConnection (TF104)', () => {
  it('mở /ws qua gateway, chỉ websocket, lấy token từ BFF lúc bắt tay', async () => {
    const { options } = connect();
    const [url, socketOptions] = io.mock.calls[0] as [
      string,
      { path: string; transports: string[]; auth: (cb: (data: unknown) => void) => void },
    ];
    expect(url).toBe('https://gateway.example');
    expect(socketOptions).toMatchObject({ path: '/ws', transports: ['websocket'] });
    const send = vi.fn();
    socketOptions.auth(send);
    await flush();
    expect(options.getToken).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({ token: 'staff-token' });
  });

  it('báo trạng thái kết nối; lần nối lại gọi onReconnect để bù phần đã lỡ', () => {
    const { options } = connect();
    expect(options.onStatus).toHaveBeenLastCalledWith('connecting');
    fire('connect');
    expect(options.onStatus).toHaveBeenLastCalledWith('live');
    expect(options.onReconnect).not.toHaveBeenCalled();
    fire('disconnect');
    expect(options.onStatus).toHaveBeenLastCalledWith('offline');
    fire('connect');
    expect(options.onReconnect).toHaveBeenCalledTimes(1);
  });

  it('nghe moderation.changed của phòng staff, bỏ qua dữ liệu đi kèm và gắn giờ nhận', () => {
    const { options } = connect({ now: () => new Date('2026-11-17T02:00:00Z') });
    expect(STAFF_MODERATION_CHANGED_EVENT).toBe('moderation.changed');
    fire(STAFF_MODERATION_CHANGED_EVENT, { injected: '<script>' });
    expect(options.onSignal).toHaveBeenCalledWith({ at: '2026-11-17T02:00:00.000Z' });
  });

  it('token hết hạn hoặc bị từ chối thì nối lại tối đa 3 lần liên tiếp', () => {
    connect();
    fire('auth.expired');
    fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unauthorized' } }));
    fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unauthorized' } }));
    fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unauthorized' } }));
    expect(socket.connect).toHaveBeenCalledTimes(3);
    fire('connect_error', Object.assign(new Error('x'), { data: { code: 'unavailable' } }));
    expect(socket.connect).toHaveBeenCalledTimes(3);
  });

  it('dừng thì ngắt socket và không báo offline nữa', () => {
    const { connection, options } = connect();
    connection.stop();
    fire('disconnect');
    expect(socket.disconnect).toHaveBeenCalled();
    expect(options.onStatus).not.toHaveBeenCalledWith('offline');
  });
});

describe('fetchStaffRealtimeToken', () => {
  it('gọi BFF và chỉ trả chuỗi token', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ accessToken: 'abc', expiresAt: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ baseUrl: '/bff' });
    await expect(fetchStaffRealtimeToken()).resolves.toBe('abc');
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/bff${STAFF_REALTIME_TOKEN_PATH}`);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(fetchStaffRealtimeToken()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
