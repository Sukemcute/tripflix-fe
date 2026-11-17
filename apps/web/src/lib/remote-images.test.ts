import { describe, expect, it } from 'vitest';
import { isOptimizedImageUrl } from './remote-images';

describe('isOptimizedImageUrl', () => {
  it('tối ưu ảnh từ tên miền media mới (TF82) và tên cloudfront.net cũ', () => {
    expect(isOptimizedImageUrl('https://media.tripflix.io.vn/staging/videos/a/poster_360.jpg')).toBe(true);
    expect(isOptimizedImageUrl('https://d399hxccn6y84z.cloudfront.net/staging/videos/a/poster_360.jpg')).toBe(true);
  });

  it('host lạ, http hoặc chuỗi không phải URL thì tải ảnh gốc', () => {
    expect(isOptimizedImageUrl('https://evil.example/a.jpg')).toBe(false);
    expect(isOptimizedImageUrl('http://media.tripflix.io.vn/a.jpg')).toBe(false);
    expect(isOptimizedImageUrl('không phải url')).toBe(false);
  });
});
