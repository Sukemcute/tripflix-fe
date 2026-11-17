import { describe, expect, it, vi } from 'vitest';
import { FeedEventQueue, ReelViewClock, type FeedEvent } from './feed-events';
import { HttpError } from './http';

const POST = '018d9f00-0000-7000-8000-000000000001';
const view = { type: 'view' as const, postId: POST, watchedMs: 2_000, surface: 'reels' as const };

function queueWith(send: (events: FeedEvent[]) => Promise<void>) {
  let n = 0;
  return new FeedEventQueue(send, () => `id-${(n += 1)}`);
}

describe('FeedEventQueue', () => {
  it('đủ 20 sự kiện thì tự gửi, mỗi sự kiện có eventId riêng', async () => {
    const send = vi.fn((_events: FeedEvent[]): Promise<void> => Promise.resolve());
    const queue = queueWith(send);

    for (let i = 0; i < 19; i += 1) queue.push(view);
    expect(send).not.toHaveBeenCalled();
    queue.push(view);
    await queue.flush();

    expect(send).toHaveBeenCalledTimes(1);
    const batch = send.mock.calls[0]?.[0] ?? [];
    expect(batch).toHaveLength(20);
    expect(new Set(batch.map((event) => event.eventId)).size).toBe(20);
  });

  it('lỗi mạng thì giữ lại để lần sau gửi, cùng eventId', async () => {
    const send = vi.fn((_events: FeedEvent[]): Promise<void> => Promise.reject(new TypeError('Network request failed')));
    const queue = queueWith(send);
    queue.push(view);

    await queue.flush();
    expect(queue.size).toBe(1);
    send.mockImplementation(() => Promise.resolve());
    await queue.flush();

    expect(send.mock.calls[1]?.[0]?.[0]?.eventId).toBe(send.mock.calls[0]?.[0]?.[0]?.eventId);
    expect(queue.size).toBe(0);
  });

  it('BE từ chối lô (400) thì bỏ, không gửi lại mãi; 503 thì giữ', async () => {
    const send = vi.fn((_events: FeedEvent[]): Promise<void> => Promise.reject(new HttpError(400, {})));
    const queue = queueWith(send);
    queue.push(view);
    await queue.flush();
    expect(queue.size).toBe(0);

    send.mockImplementation(() => Promise.reject(new HttpError(503, {})));
    queue.push(view);
    await queue.flush();
    expect(queue.size).toBe(1);
  });

  it('mất mạng lâu chỉ giữ 200 sự kiện mới nhất; bỏ qua id không phải uuid (Reels mẫu)', async () => {
    const queue = queueWith(() => Promise.reject(new TypeError('offline')));
    queue.push({ ...view, postId: 'demo-1' });
    expect(queue.size).toBe(0);

    for (let i = 0; i < 260; i += 1) queue.push(view);
    await queue.flush();

    expect(queue.size).toBe(200);
  });
});

describe('ReelViewClock', () => {
  it('chỉ cộng lúc đang phát; đổi bài thì báo lượt xem của bài trước', () => {
    let now = 0;
    const onView = vi.fn();
    const clock = new ReelViewClock(onView, () => now);

    clock.update('a', true);
    now = 3_000;
    clock.update('a', false); // tạm dừng 10 giây không tính
    now = 13_000;
    clock.update('a', true);
    now = 15_000;
    clock.update('b', true);

    expect(onView).toHaveBeenCalledWith('a', 5_000);
  });

  it('lướt qua dưới 1 giây thì không báo; chốt khi app vào nền rồi xem tiếp là lượt mới', () => {
    let now = 0;
    const onView = vi.fn();
    const clock = new ReelViewClock(onView, () => now);

    clock.update('a', true);
    now = 800;
    clock.update('b', true);
    expect(onView).not.toHaveBeenCalled();

    now = 4_800;
    clock.finish();
    expect(onView).toHaveBeenLastCalledWith('b', 4_000);
    now = 6_000;
    clock.update('b', true);
    now = 8_000;
    clock.finish();
    expect(onView).toHaveBeenLastCalledWith('b', 2_000);
  });
});
