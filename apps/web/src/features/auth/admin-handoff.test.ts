import { expect, it } from 'vitest';
import { getAdminHandoffUrl } from './admin-handoff';

it('đặt mã sau # để không vào log máy chủ hay Referer, bỏ / thừa của ADMIN_URL', () => {
  expect(getAdminHandoffUrl('https://admin.tripflix.io.vn/', 'a.b+c')).toBe(
    'https://admin.tripflix.io.vn/auth/handoff#code=a.b%2Bc',
  );
  expect(getAdminHandoffUrl('http://localhost:3200', 'x')).toBe('http://localhost:3200/auth/handoff#code=x');
});
