import { describe, expect, it } from 'vitest';
import { isReelPost } from './post-type-filter';

describe('isReelPost', () => {
  it('chỉ nhận bài dạng video', () => {
    expect(isReelPost({ postType: 'video' })).toBe(true);
  });

  it('loại bài viết (vlog) khỏi Reels', () => {
    expect(isReelPost({ postType: 'vlog' })).toBe(false);
  });
});
