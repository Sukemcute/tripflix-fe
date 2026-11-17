import { expect, test } from 'vitest';
import { formatNotificationTime, getNotificationKind } from './notification-look';

test('nhóm thông báo theo type, còn lại là của Tripflix', () => {
  expect(getNotificationKind('comment.replied')).toBe('comment');
  expect(getNotificationKind('reaction.post')).toBe('reaction');
  expect(getNotificationKind('follow.post.published')).toBe('follow');
  expect(getNotificationKind('moderation.comment.hide')).toBe('tripflix');
  expect(getNotificationKind('booking.paid')).toBe('tripflix');
});

test('thời gian hiện kiểu tương đối', () => {
  const now = new Date(2026, 10, 17, 15, 0);
  expect(formatNotificationTime(new Date(2026, 10, 17, 14, 55), now)).toBe('5 phút trước');
  expect(formatNotificationTime(new Date(2026, 10, 17, 12, 0), now)).toBe('3 giờ trước');
  expect(formatNotificationTime(new Date(2026, 10, 16, 9, 0), now)).toBe('Hôm qua');
});
