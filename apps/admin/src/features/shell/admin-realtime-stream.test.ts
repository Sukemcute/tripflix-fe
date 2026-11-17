import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_REALTIME_URL, CLOSE_GRACE_MS, subscribeAdminRealtime } from './admin-realtime-stream';

class FakeSource {
  static created: FakeSource[] = [];
  handlers = new Map<string, () => void>();
  onerror: (() => unknown) | null = null;
  isClosed = false;
  constructor(public url: string) {
    FakeSource.created.push(this);
  }
  addEventListener(type: string, handler: () => void) {
    this.handlers.set(type, handler);
  }
  fire(type: string) {
    this.handlers.get(type)?.();
  }
  close() {
    this.isClosed = true;
  }
}

const create = (url: string) => new FakeSource(url);
const listener = () => ({ onReady: vi.fn(), onChange: vi.fn(), onReconnecting: vi.fn() });

describe('subscribeAdminRealtime (TF104)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSource.created = [];
  });
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('chuyển trang không mở luồng mới: trang sau dùng lại luồng của trang trước', () => {
    const first = listener();
    const unsubscribeFirst = subscribeAdminRealtime(first, create);
    FakeSource.created[0]!.fire('ready');
    unsubscribeFirst();
    const second = listener();
    const unsubscribeSecond = subscribeAdminRealtime(second, create);
    expect(FakeSource.created).toHaveLength(1);
    expect(FakeSource.created[0]!.url).toBe(ADMIN_REALTIME_URL);
    expect(second.onReady).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(CLOSE_GRACE_MS);
    expect(FakeSource.created[0]!.isClosed).toBe(false);
    unsubscribeSecond();
  });

  it('báo thay đổi và mất kết nối cho mọi trang đang nghe', () => {
    const a = listener();
    const b = listener();
    const offA = subscribeAdminRealtime(a, create);
    const offB = subscribeAdminRealtime(b, create);
    const source = FakeSource.created[0]!;
    source.fire('moderation.changed');
    source.fire('reconnecting');
    expect(a.onChange).toHaveBeenCalledTimes(1);
    expect(b.onChange).toHaveBeenCalledTimes(1);
    expect(b.onReconnecting).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it('rời hẳn admin thì đóng luồng sau thời gian chờ; lần sau mở luồng mới', () => {
    const off = subscribeAdminRealtime(listener(), create);
    off();
    vi.advanceTimersByTime(CLOSE_GRACE_MS - 1);
    expect(FakeSource.created[0]!.isClosed).toBe(false);
    vi.advanceTimersByTime(1);
    expect(FakeSource.created[0]!.isClosed).toBe(true);
    const offAgain = subscribeAdminRealtime(listener(), create);
    expect(FakeSource.created).toHaveLength(2);
    offAgain();
  });

  it('mất kết nối thì trang mở sau chưa được báo ready cho tới khi luồng nối lại', () => {
    const offFirst = subscribeAdminRealtime(listener(), create);
    const source = FakeSource.created[0]!;
    source.fire('ready');
    source.fire('reconnecting');
    const late = listener();
    const offLate = subscribeAdminRealtime(late, create);
    expect(late.onReady).not.toHaveBeenCalled();
    source.fire('ready');
    expect(late.onReady).toHaveBeenCalledTimes(1);
    offFirst();
    offLate();
  });
});
