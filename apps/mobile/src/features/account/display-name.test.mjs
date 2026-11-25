import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDisplayName } from './display-name.ts';

const FALLBACK = 'Người dùng Tripflix';

test('dùng tên hiển thị khi có', () => {
  assert.equal(getDisplayName('Thu Trang', FALLBACK), 'Thu Trang');
});

test('bỏ khoảng trắng thừa quanh tên', () => {
  assert.equal(getDisplayName('  Thu Trang  ', FALLBACK), 'Thu Trang');
});

test('không có tên thì dùng nhãn chung, không lộ mã tài khoản', () => {
  assert.equal(getDisplayName(null, FALLBACK), FALLBACK);
  assert.equal(getDisplayName(undefined, FALLBACK), FALLBACK);
  assert.equal(getDisplayName('', FALLBACK), FALLBACK);
  assert.equal(getDisplayName('   ', FALLBACK), FALLBACK);
});
