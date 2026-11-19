import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots.txt', () => {
  it('chặn API và các trang riêng của người dùng, mở phần còn lại', () => {
    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/', '/account', '/auth', '/bookings', '/cart', '/checkout', '/payments'],
        },
      ],
      sitemap: 'https://tripflix.io.vn/sitemap.xml',
    });
  });
});
