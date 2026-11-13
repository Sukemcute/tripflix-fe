import { describe, expect, it } from 'vitest';
import { resolveNotificationHref } from './notification-href';

describe('resolveNotificationHref', () => {
  it('thông báo đơn có orderId thì mở thẳng trang đơn, bỏ qua link chung /bookings', () => {
    expect(resolveNotificationHref({ type: 'booking.paid', link: '/bookings', data: { orderId: 'ord-1' } })).toBe(
      '/checkout/ord-1',
    );
  });

  it('mã hoá orderId để không thoát ra khỏi đường dẫn đơn', () => {
    expect(resolveNotificationHref({ type: 'booking.paid', link: null, data: { orderId: '../x?y' } })).toBe('/checkout/..%2Fx%3Fy');
  });

  it('không có orderId thì dùng link của thông báo nếu là đường dẫn web', () => {
    expect(resolveNotificationHref({ type: 'account', link: '/account', data: {} })).toBe('/account');
    expect(resolveNotificationHref({ type: 'account', link: 'https://tripflix.io.vn/a', data: {} })).toBe(
      'https://tripflix.io.vn/a',
    );
  });

  it.each(['comment.created', 'comment.replied'])('mở đúng bình luận cho thông báo cũ %s', (type) => {
    expect(resolveNotificationHref({ type, link: '/trips/p', data: { postId: 'p', commentId: 'c' } }))
      .toBe('/trips/p?comment=c');
  });

  it.each(['//evil.example', 'javascript:alert(1)', null])('bỏ link không an toàn hoặc trống: %s', (link) => {
    expect(resolveNotificationHref({ type: 'account', link, data: { orderId: 42 } })).toBeNull();
  });
});
