import { describe, expect, it } from 'vitest';
import { buildInspirationHref, buildPostHref } from './search-url';

describe('buildPostHref', () => {
  it('bài viết mở ở trang Cảm hứng, Reel thêm kind=reel', () => {
    expect(buildPostHref('p1')).toBe('/inspiration?open=p1');
    expect(buildPostHref('r1', { postType: 'video' })).toBe('/inspiration?open=r1&kind=reel');
  });

  it('kèm bình luận cần nhảy tới, mã hoá id lạ', () => {
    expect(buildPostHref('p1', { commentId: 'c&1' })).toBe('/inspiration?open=p1&comment=c%261');
  });
});

describe('buildInspirationHref với bình luận', () => {
  const current = 'open=p1&comment=c1';

  it('giữ bình luận khi chỉ chuyển bài sang trình xem Reels', () => {
    expect(buildInspirationHref('/inspiration', current, { openPostId: 'p1', isOpenReel: true }))
      .toBe('/inspiration?open=p1&comment=c1&kind=reel');
  });

  it('bỏ bình luận khi đóng bài, đổi bài hoặc tìm từ khoá mới', () => {
    expect(buildInspirationHref('/inspiration', current, { openPostId: null })).toBe('/inspiration');
    expect(buildInspirationHref('/inspiration', current, { openPostId: 'p2' })).toBe('/inspiration?open=p2');
    expect(buildInspirationHref('/inspiration', current, { keyword: 'đà lạt' })).toBe('/inspiration?q=%C4%91%C3%A0+l%E1%BA%A1t');
  });
});
