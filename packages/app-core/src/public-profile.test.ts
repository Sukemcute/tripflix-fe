import { describe, expect, it } from 'vitest';
import { formatProfileCount, getNameInitials } from './public-profile';

describe('formatProfileCount', () => {
  it('giữ số nhỏ, rút gọn nghìn và triệu, không làm tròn lên', () => {
    expect(formatProfileCount(0)).toBe('0');
    expect(formatProfileCount(999)).toBe('999');
    expect(formatProfileCount(1000)).toBe('1K');
    expect(formatProfileCount(1250)).toBe('1.2K');
    expect(formatProfileCount(999_999)).toBe('999.9K');
    expect(formatProfileCount(3_480_000)).toBe('3.4M');
  });
});

describe('getNameInitials', () => {
  it('lấy 2 chữ đầu, viết hoa tiếng Việt', () => {
    expect(getNameInitials('  bảo   lê  văn')).toBe('BL');
    expect(getNameInitials('đức')).toBe('Đ');
    expect(getNameInitials('')).toBe('');
  });
});
