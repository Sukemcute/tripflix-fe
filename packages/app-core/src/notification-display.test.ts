import { expect, it } from 'vitest';
import { formatUnreadBadge, getNotificationAge } from './notification-display';

const now = new Date(2026, 10, 16, 15, 0, 0);
const at = (hours: number, minutes = 0, day = 16) => new Date(2026, 10, day, hours, minutes);

it.each([
  { createdAt: at(14, 59, 16), expected: { kind: 'minutes', count: 1 } },
  { createdAt: new Date(now.getTime() - 30_000), expected: { kind: 'justNow' } },
  { createdAt: new Date(now.getTime() + 60_000), expected: { kind: 'justNow' } },
  { createdAt: at(14, 5), expected: { kind: 'minutes', count: 55 } },
  { createdAt: at(1), expected: { kind: 'hours', count: 14 } },
  { createdAt: at(23, 0, 15), expected: { kind: 'yesterday' } },
  { createdAt: at(10, 0, 14), expected: { kind: 'date' } },
])('thời gian thông báo $createdAt → $expected.kind', ({ createdAt, expected }) => {
  expect(getNotificationAge(createdAt, now)).toEqual(expected);
});

it('huy hiệu ẩn khi 0, quá 9 thì 9+', () => {
  expect(formatUnreadBadge(0)).toBeNull();
  expect(formatUnreadBadge(3)).toBe('3');
  expect(formatUnreadBadge(9)).toBe('9');
  expect(formatUnreadBadge(42)).toBe('9+');
});
