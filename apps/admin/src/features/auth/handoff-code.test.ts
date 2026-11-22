import { expect, it, vi } from 'vitest';
import { takeHandoffCode } from './handoff-code';

it('lấy mã từ #code= và xoá mã khỏi địa chỉ', () => {
  const history = { replaceState: vi.fn() };
  expect(takeHandoffCode({ hash: '#code=a.b%2Bc', pathname: '/auth/handoff' }, history)).toBe('a.b+c');
  expect(history.replaceState).toHaveBeenCalledWith(null, '', '/auth/handoff');
  expect(takeHandoffCode({ hash: '', pathname: '/auth/handoff' }, history)).toBeNull();
});
