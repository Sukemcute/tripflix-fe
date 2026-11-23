import { describe, expect, it } from 'vitest';
import { getEngagementRefreshKeys } from './engagement-refresh';

describe('getEngagementRefreshKeys', () => {
  it('Thích chỉ làm mới chi tiết bài, không tải lại cả bảng tin', () => {
    expect(getEngagementRefreshKeys('like', 'p1')).toEqual([['social', 'post', 'p1']]);
  });

  it('Lưu làm mới chi tiết bài và danh sách đã lưu', () => {
    expect(getEngagementRefreshKeys('save', 'p1')).toEqual([['social', 'post', 'p1'], ['social', 'bookmarks']]);
  });

  it('Chia sẻ vẫn tải lại mọi query social vì chưa ghi số vào cache', () => {
    expect(getEngagementRefreshKeys('share', 'p1')).toEqual([['social']]);
  });
});
