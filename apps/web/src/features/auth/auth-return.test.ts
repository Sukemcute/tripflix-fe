import { expect, it } from 'vitest';
import { readSafeReturnTo } from './auth-return';

it('đăng nhập quay lại trang kiểm duyệt và vẫn chặn redirect bên ngoài', () => {
  expect(readSafeReturnTo('/account/moderation')).toBe('/account/moderation');
  expect(readSafeReturnTo('/account/moderation?decision=123')).toBe('/account/moderation?decision=123');
  for (const path of [
    'https://evil.test',
    '//evil.test',
    '/account/moderation/../../evil',
    '/account/moderation-evil',
  ])
    expect(readSafeReturnTo(path)).toBe('/account');
});
