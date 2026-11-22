import { describe, expect, it } from 'vitest';
import { AVATAR_TONES, getAvatarTone } from './avatar-tone';

describe('getAvatarTone', () => {
  it('cùng một tên luôn cho cùng màu, không phân biệt hoa thường và khoảng trắng đầu cuối', () => {
    expect(getAvatarTone('Hoàng Nam Travel')).toBe(getAvatarTone('  hoàng nam travel '));
  });

  it('chỉ trả màu trong bảng màu cho phép, kể cả khi thiếu tên', () => {
    for (const name of ['Bảo Ngọc Review', 'Minh Trang Vi Vu', '', null, undefined]) {
      expect(AVATAR_TONES).toContain(getAvatarTone(name));
    }
  });

  it('các tên khác nhau được rải ra nhiều màu', () => {
    const tones = new Set(
      ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khoa', 'Linh', 'Minh', 'Nam', 'Phong'].map(getAvatarTone),
    );
    expect(tones.size).toBeGreaterThan(1);
  });
});
