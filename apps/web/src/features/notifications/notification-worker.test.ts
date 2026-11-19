import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { createNotificationArrivals } from './notification-arrivals';

function runtime(isFocused = true) {
  const listeners = new Map<string, (event: unknown) => void>();
  const memory = new Map<string, unknown>();
  const seen = new Set<string>();
  const client = {
    url: 'https://tripflix.test/account',
    visibilityState: isFocused ? 'visible' : 'hidden',
    focused: isFocused,
    postMessage: vi.fn(),
    focus: vi.fn().mockResolvedValue(undefined),
  };
  const registration = {
    showNotification: vi.fn().mockResolvedValue(undefined),
    getNotifications: vi.fn().mockResolvedValue([]),
    pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
  };
  const context = createContext({
    URL,
    Date,
    memory,
    seen,
    self: {
      location: { origin: 'https://tripflix.test' },
      registration,
      clients: { matchAll: vi.fn().mockResolvedValue([client]), openWindow: vi.fn(), claim: vi.fn() },
      addEventListener: (event: string, handler: (event: unknown) => void) => listeners.set(event, handler),
    },
  });
  runInContext(readFileSync(new URL('../../../public/notification-sw.js', import.meta.url), 'utf8'), context);
  // Các bài test này kiểm tra chính sách hiển thị; giao dịch IDB thật được kiểm trong trình duyệt.
  runInContext(
    `state = async (key, value, write) => { if (write) memory.set(key, value); return memory.get(key); };
    claim = async (user, id) => { const key=user+':'+id; if(seen.has(key))return false; seen.add(key);return true; };`,
    context,
  );
  const message = {
    userId: 'a',
    subscriptionId: 'device-a',
    item: { id: 'n1', title: 'Trang trả lời', body: 'Bình luận mới' },
    href: '/inspiration?open=p&comment=c',
  };
  memory.set('owner', { userId: 'a', subscriptionId: 'device-a' });
  const present = (value = message, push = true) => {
    context.input = value;
    context.isPush = push;
    return runInContext('present(input, isPush)', context) as Promise<string | undefined>;
  };
  const dispatch = async (kind: string, event: Record<string, unknown>) => {
    let pending: Promise<unknown> | undefined;
    listeners.get(kind)?.({
      ...event,
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  };
  return { memory, client, registration, present, message, dispatch };
}

describe('notification worker presentation policy', () => {
  it('tab đang hiển thị chưa có focus vẫn tự hiện thẻ khi chưa đăng ký OS push', async () => {
    const app = runtime(false);
    app.client.visibilityState = 'visible';
    app.memory.set('owner', { userId: 'a', subscriptionId: null });
    await app.present(app.message, false);
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(1);
    expect(app.registration.showNotification).not.toHaveBeenCalled();
  });
  it('trình bày từ message realtime có ACK shown và không cần thao tác chuông', async () => {
    const app = runtime(false);
    app.client.visibilityState = 'visible';
    app.memory.set('owner', { userId: 'a', subscriptionId: null });
    const reply = vi.fn();
    await app.dispatch('message', {
      source: app.client,
      data: { type: 'NOTIFICATION_PRESENT', ...app.message },
      ports: [{ postMessage: reply }],
    });
    expect(reply).toHaveBeenCalledWith({ ok: true, presentation: 'shown' });
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(1);
  });
  it('khi đã đăng ký OS push, tab hiển thị nhưng mất focus vẫn nhận thẻ (để phát âm Tripi)', async () => {
    const app = runtime(false);
    app.client.visibilityState = 'visible';
    expect(await app.present(app.message, false)).toBe('shown');
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(1);
    expect(await app.present(app.message, true)).toBe('duplicate');
    expect(app.registration.showNotification).not.toHaveBeenCalled();
  });
  it('khi đã đăng ký OS push, tab bị ẩn thì socket trả deferred để OS push báo', async () => {
    const app = runtime(false);
    expect(await app.present(app.message, false)).toBe('deferred');
    await app.present(app.message, true);
    expect(app.registration.showNotification).toHaveBeenCalledTimes(1);
  });
  it('thông báo đến ở nền vẫn hiện thẻ khi quay lại, không cần nội dung inbox thay đổi', async () => {
    const app = runtime(false);
    const observe = createNotificationArrivals();
    const item = {
      ...app.message.item,
      type: 'comment.replied',
      link: '/account',
      data: {},
      createdAt: new Date(110).toISOString(),
      readAt: null,
    };
    observe('a', [], 100);
    expect(observe('a', [item], 120, { canPresent: false })).toEqual([]);
    await app.present({ ...app.message, item }, false);
    app.client.visibilityState = 'visible';
    app.client.focused = true;
    const [fresh] = observe('a', [item], 130, { canPresent: true });
    expect(fresh).toBeDefined();
    await app.present({ ...app.message, item: fresh! }, false);
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(1);
    expect(app.registration.showNotification).not.toHaveBeenCalled();
  });
  it('mục chờ đã báo qua hệ điều hành không bật thêm thẻ khi quay lại', async () => {
    const app = runtime(false);
    const observe = createNotificationArrivals();
    const item = {
      ...app.message.item,
      type: 'comment.replied',
      link: '/account',
      data: {},
      createdAt: new Date(110).toISOString(),
      readAt: null,
    };
    observe('a', [], 100);
    observe('a', [item], 120, { canPresent: false });
    await app.present({ ...app.message, item }, true);
    app.client.visibilityState = 'visible';
    app.client.focused = true;
    const [fresh] = observe('a', [item], 130, { canPresent: true });
    await app.present({ ...app.message, item: fresh! }, false);
    expect(app.registration.showNotification).toHaveBeenCalledTimes(1);
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(0);
  });
  it('socket và push cùng id chỉ hiện một thẻ, không hiện OS khi đang xem Web', async () => {
    const app = runtime();
    await Promise.all([app.present(app.message, false), app.present()]);
    expect(
      app.client.postMessage.mock.calls.filter(([message]) => message.type === 'NOTIFICATION_TOAST'),
    ).toHaveLength(1);
    expect(app.registration.showNotification).not.toHaveBeenCalled();
  });
  it('ở nền socket không hiện; push hiện OS, không đánh dấu đã đọc', async () => {
    const app = runtime(false);
    await app.present(app.message, false);
    expect(app.registration.showNotification).not.toHaveBeenCalled();
    await app.present();
    expect(app.registration.showNotification).toHaveBeenCalledTimes(1);
    expect(app.registration.showNotification.mock.calls[0]?.[1].data.href).toBe(
      '/inspiration?open=p&comment=c',
    );
    expect(app.client.postMessage.mock.calls.some(([message]) => message.type === 'NOTIFICATION_CLICK')).toBe(
      false,
    );
  });
  it('bỏ push tài khoản/đăng ký cũ sau logout hoặc đổi tài khoản', async () => {
    const app = runtime(false);
    await app.present({ ...app.message, userId: 'old' });
    await app.present({ ...app.message, subscriptionId: 'old-device' });
    app.memory.set('owner', null);
    await app.present();
    expect(app.registration.showNotification).not.toHaveBeenCalled();
  });
  it('chặn URL bên ngoài và JavaScript trong notificationclick', async () => {
    const app = runtime(false);
    await app.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { userId: 'a', id: 'n1', href: 'javascript:alert(1)' } },
    });
    expect(app.client.postMessage).toHaveBeenCalledWith({
      type: 'NOTIFICATION_CLICK',
      userId: 'a',
      id: 'n1',
      href: '/',
    });
  });
  it('logout đóng thông báo và hủy subscription; message khác origin không được đổi chủ', async () => {
    const app = runtime();
    await app.dispatch('message', {
      source: { url: 'https://evil.test/' },
      data: { type: 'NOTIFICATION_OWNER', userId: 'evil' },
    });
    expect(app.memory.get('owner')).toMatchObject({ userId: 'a' });
    const close = vi.fn();
    const unsubscribe = vi.fn();
    app.registration.getNotifications.mockResolvedValue([{ close }] as never);
    app.registration.pushManager.getSubscription.mockResolvedValue({ unsubscribe } as never);
    await app.dispatch('message', { source: app.client, data: { type: 'NOTIFICATION_LOGOUT', userId: 'a' } });
    expect(app.memory.get('owner')).toBeNull();
    expect(close).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });
  it('gia hạn cùng người giữ binding và không làm mất click chờ xử lý', async () => {
    const app = runtime();
    app.memory.set('click', { userId: 'a', id: 'n1', href: '/account' });
    await app.dispatch('message', { source: app.client, data: { type: 'NOTIFICATION_OWNER', userId: 'a' } });
    expect(app.memory.get('owner')).toMatchObject({ subscriptionId: 'device-a' });
    await app.dispatch('message', { source: app.client, data: { type: 'NOTIFICATION_DRAIN', userId: 'a' } });
    expect(app.client.postMessage).toHaveBeenCalledWith({
      type: 'NOTIFICATION_CLICK',
      userId: 'a',
      id: 'n1',
      href: '/account',
    });
    expect(app.memory.get('click')).toBeNull();
  });
});
