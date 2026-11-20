import { describe, expect, it } from 'vitest';
import { notificationTitle } from './notification-title';

describe('notification tab title', () => {
  it('preserves route titles and replaces counts without stacking', () => {
    expect(notificationTitle('(2) Chuyến đi | Tripflix', 4)).toBe('(4) Chuyến đi | Tripflix');
    expect(notificationTitle('Trang cá nhân | Tripflix', 1)).toBe('(1) Trang cá nhân | Tripflix');
  });
  it('removes the count on read/logout and caps large counts', () => {
    expect(notificationTitle('(99+) Tripflix', 0)).toBe('Tripflix');
    expect(notificationTitle('Tripflix', 1000)).toBe('(99+) Tripflix');
  });
});
