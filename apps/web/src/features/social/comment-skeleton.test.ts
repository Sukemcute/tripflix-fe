import { describe, expect, it } from 'vitest';
import * as commentSkeleton from './comment-skeleton';
import { CommentSkeletonList, ROW_WIDTH_PRESETS, getRowWidthPreset } from './comment-skeleton';

describe('CommentSkeletonList', () => {
  it('là component tải thuần, không kèm bình luận mẫu nào có thể hiện ra cho người dùng', () => {
    expect(typeof CommentSkeletonList).toBe('function');
    expect(Object.keys(commentSkeleton).sort()).toEqual(
      ['CommentSkeletonList', 'ROW_WIDTH_PRESETS', 'getRowWidthPreset'].sort(),
    );
  });

  it('getRowWidthPreset trả về tỷ lệ bề rộng tự nhiên theo chu kỳ', () => {
    expect(ROW_WIDTH_PRESETS).toHaveLength(8);
    expect(getRowWidthPreset(0)).toEqual({ meta: '38%', body: '88%' });
    expect(getRowWidthPreset(1).meta).toBe('44%');
    expect(getRowWidthPreset(8)).toEqual(getRowWidthPreset(0));
  });
});
