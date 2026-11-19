import type { InboxNotification } from '@tripflix/api-client';
import { describe, expect, it } from 'vitest';
import { createNotificationArrivals } from './notification-arrivals';

const item = (id: string, created: number, readAt: string | null = null): InboxNotification => ({
  id,
  createdAt: new Date(created).toISOString(),
  readAt,
  type: 'follow.post.published',
  title: 'Bài mới',
  body: '',
  link: '/',
  data: {},
});
describe('notification arrivals from polling', () => {
  it('worker chưa trình bày thì cho thử lại cùng mục, không xóa mốc của tài khoản khác', () => {
    const observe = createNotificationArrivals();
    observe('a', [], 100);
    const inbox = [item('pending', 110)];
    expect(observe('a', inbox, 120)).toHaveLength(1);
    observe.defer('other-user', 'pending');
    expect(observe('a', inbox, 125)).toEqual([]);
    observe.defer('a', 'pending');
    expect(observe('a', inbox, 130)).toHaveLength(1);
  });
  it('không bật lịch sử khi tải lần đầu, chỉ bật mục mới một lần', () => {
    const observe = createNotificationArrivals();
    expect(observe('a', [item('old', 50)], 100)).toEqual([]);
    expect(observe('a', [item('new', 110), item('old', 50)], 120).map((entry) => entry.id)).toEqual(['new']);
    expect(observe('a', [item('new', 110)], 130)).toEqual([]);
  });
  it('bỏ mục đã đọc và lịch sử được tải thêm', () => {
    const observe = createNotificationArrivals();
    observe('a', [], 100);
    expect(observe('a', [item('page2', 40), item('read', 110, new Date(111).toISOString())], 120)).toEqual(
      [],
    );
  });
  it('logout hoặc đổi tài khoản tạo lại mốc, không trộn dữ liệu người cũ', () => {
    const observe = createNotificationArrivals();
    observe('a', [], 100);
    expect(observe('b', [item('b-old', 200)], 300)).toEqual([]);
    observe(undefined, [], 400);
    expect(observe('b', [item('b-old', 200)], 500)).toEqual([]);
  });
  it('giữ mục mới khi tab ở nền để hiện một lần lúc quay lại', () => {
    const observe = createNotificationArrivals();
    observe('a', [item('old', 50)], 100);
    const inbox = [item('reply', 110), item('old', 50)];
    expect(observe('a', inbox, 120, { canPresent: false })).toEqual([]);
    expect(observe('a', inbox, 130, { canPresent: true }).map((entry) => entry.id)).toEqual(['reply']);
    expect(observe('a', inbox, 140, { canPresent: true })).toEqual([]);
  });
  it('không bật mục đã đọc ở tab khác hoặc mục cũ quá hai phút khi quay lại', () => {
    const observe = createNotificationArrivals();
    observe('a', [], 1000);
    observe('a', [item('reply', 2000)], 3000, { canPresent: false });
    expect(
      observe('a', [item('reply', 2000, new Date(4000).toISOString())], 5000, { canPresent: true }),
    ).toEqual([]);
    observe('a', [item('stale', 6000)], 7000, { canPresent: false });
    expect(observe('a', [item('stale', 6000)], 180000, { canPresent: true })).toEqual([]);
  });
});
