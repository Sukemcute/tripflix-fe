import { describe, expect, it } from 'vitest';
import config from '../../next.config';
import { SECURITY_HEADERS } from './security-headers';

describe('security headers', () => {
  it('gắn nosniff, Referrer-Policy và X-Frame-Options cho mọi trang', async () => {
    expect(await config.headers?.()).toEqual([{ source: '/:path*', headers: [...SECURITY_HEADERS] }]);
    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    });
  });
});
