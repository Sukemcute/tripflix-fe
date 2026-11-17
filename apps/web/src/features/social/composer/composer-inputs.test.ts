import { describe, expect, it } from 'vitest';
import {
  appendHashtags,
  calculateUploadPercent,
  normalizeHashtag,
  parseStoredHashtags,
  pickDroppedVideo,
} from './composer-inputs';

describe('thẻ (hashtag)', () => {
  it('chuẩn hoá: bỏ #, khoảng trắng, chữ thường, tối đa 30 ký tự', () => {
    expect(normalizeHashtag('  ##HộiAn ')).toBe('hộian');
    expect(normalizeHashtag('#')).toBe('');
    expect(normalizeHashtag('a'.repeat(40))).toHaveLength(30);
  });

  it('dán nhiều thẻ một lần: tách theo dấu phẩy và khoảng trắng, bỏ thẻ trùng và thẻ rỗng', () => {
    expect(appendHashtags(['dalat'], 'DaLat, #cảnhđẹp,,  ănuống phượt')).toEqual([
      'dalat',
      'cảnhđẹp',
      'ănuống',
      'phượt',
    ]);
  });

  it('không vượt quá 10 thẻ', () => {
    const tags = appendHashtags([], Array.from({ length: 12 }, (_, i) => `the${i}`).join(','));
    expect(tags).toHaveLength(10);
    expect(appendHashtags(tags, 'them')).toEqual(tags);
  });

  it('bản nháp cũ lưu mảng thẻ: đọc lại đúng, không trùng', () => {
    expect(parseStoredHashtags(['#Hue', 'hue', 'bien'])).toEqual(['hue', 'bien']);
    expect(parseStoredHashtags(undefined)).toEqual([]);
  });
});

describe('tiến độ tải video', () => {
  it('chạy liên tục theo byte đã gửi, từ 5% tới 90%', () => {
    const total = 100 * 1024 * 1024;
    expect(calculateUploadPercent(0, total)).toBe(5);
    expect(calculateUploadPercent(total / 4, total)).toBe(26);
    expect(calculateUploadPercent(total / 2, total)).toBe(48);
    expect(calculateUploadPercent(total, total)).toBe(90);
  });

  it('không vượt khoảng khi số byte lạ', () => {
    expect(calculateUploadPercent(200, 100)).toBe(90);
    expect(calculateUploadPercent(-5, 100)).toBe(5);
    expect(calculateUploadPercent(10, 0)).toBe(5);
  });
});

describe('thả video vào ô chọn', () => {
  const file = (name: string, type: string) => new File(['x'], name, { type });

  it('nhận MP4, MOV (kể cả trình duyệt không báo type)', () => {
    expect(pickDroppedVideo([file('a.mp4', 'video/mp4')])).toHaveProperty('file');
    expect(pickDroppedVideo([file('b.MOV', '')])).toHaveProperty('file');
  });

  it('từ chối file khác loại và lần thả rỗng', () => {
    expect(pickDroppedVideo([file('a.png', 'image/png')])).toEqual({ error: 'type' });
    expect(pickDroppedVideo([])).toEqual({ error: 'empty' });
    expect(pickDroppedVideo(null)).toEqual({ error: 'empty' });
  });
});
