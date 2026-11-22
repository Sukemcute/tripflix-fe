import { describe, expect, it } from 'vitest';
import { getPostImages } from './post-cover';

describe('getPostImages', () => {
  it('bài có ảnh tác giả tải lên: chỉ dùng đúng các ảnh đó theo thứ tự, không trộn ảnh minh hoạ', () => {
    const images = getPostImages({
      uploadedImageUrls: ['https://cdn/b.jpg', 'https://cdn/a.jpg'],
      destinationName: 'Đà Lạt',
      title: 'Đà Lạt 3 ngày',
    });
    expect(images.map((image) => image.src)).toEqual(['https://cdn/b.jpg', 'https://cdn/a.jpg']);
  });

  it('bài chưa có ảnh: vẫn dùng ảnh minh hoạ theo điểm đến như trước', () => {
    const images = getPostImages({ uploadedImageUrls: [], destinationName: 'Đà Lạt', title: 'Đà Lạt 3 ngày' });
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((image) => !image.src.startsWith('https://cdn/'))).toBe(true);
  });
});
