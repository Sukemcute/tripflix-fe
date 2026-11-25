import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRelativeTimeParts, pickAvatarTone } from './comment-display.ts';

const NOW = new Date(2026, 10, 24, 12, 0, 0).getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();

test('dưới một phút là vừa xong', () => {
  assert.deepEqual(getRelativeTimeParts(ago(30_000), NOW), { unit: 'justNow' });
});

test('phút, giờ, ngày tính theo khoảng đã trôi qua', () => {
  assert.deepEqual(getRelativeTimeParts(ago(5 * 60_000), NOW), { unit: 'minutes', count: 5 });
  assert.deepEqual(getRelativeTimeParts(ago(3 * 3_600_000), NOW), { unit: 'hours', count: 3 });
  assert.deepEqual(getRelativeTimeParts(ago(2 * 86_400_000), NOW), { unit: 'days', count: 2 });
});

test('quá 7 ngày thì hiện ngày, khác năm thì kèm năm', () => {
  assert.deepEqual(getRelativeTimeParts(new Date(2026, 10, 4, 9).toISOString(), NOW), {
    unit: 'sameYear',
    day: 4,
    month: 11,
  });
  assert.deepEqual(getRelativeTimeParts(new Date(2025, 11, 31, 9).toISOString(), NOW), {
    unit: 'otherYear',
    day: 31,
    month: 12,
    year: 2025,
  });
});

test('mốc thời gian hỏng thì không hiện gì', () => {
  assert.equal(getRelativeTimeParts('không phải ngày', NOW), null);
});

test('cùng người luôn cùng màu avatar và nằm trong bảng màu', () => {
  const tone = pickAvatarTone('018d9f00-aaaa-bbbb', 4);
  assert.equal(pickAvatarTone('018d9f00-aaaa-bbbb', 4), tone);
  assert.ok(tone >= 0 && tone < 4);
  assert.equal(pickAvatarTone('abc', 0), 0);
});
