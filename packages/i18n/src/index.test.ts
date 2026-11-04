import { describe, expect, it } from 'vitest';
import { t } from './index';

describe('t', () => {
  it('lấy chuỗi theo khoá', () => {
    expect(t('tabs.feed')).toBe('Lướt');
  });

  it('thay tham số', () => {
    expect(t('booking.holdExpiresIn', { time: '29:59' })).toBe('Giữ chỗ còn 29:59');
  });
});
