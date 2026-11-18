import { describe, expect, it } from 'vitest';
import { buildInspirationHref, buildPostHref, getPlaceKind, getSectionResultType, parseSearchResultType, parseSearchSort } from './search-url';

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

describe('tab kết quả tìm kiếm', () => {
  it('đọc tab từ URL, giá trị lạ về Tất cả', () => {
    expect(parseSearchResultType('users')).toBe('users');
    expect(parseSearchResultType('cafe')).toBe('cafe');
    expect(parseSearchResultType('hotels')).toBe('hotels');
    expect(parseSearchResultType('bar')).toBe('all');
    expect(parseSearchResultType(null)).toBe('all');
  });

  it('tab chỗ, điểm gọi đúng loại của discovery; tab bài và người dùng không gọi', () => {
    expect(getPlaceKind('hotels')).toBe('stay');
    expect(getPlaceKind('places')).toBe('see');
    expect(getPlaceKind('users')).toBeNull();
    expect(getPlaceKind('posts')).toBeNull();
    expect(getPlaceKind('all')).toBeNull();
  });

  it('"Xem tất cả" của từng vùng mở đúng tab', () => {
    expect(getSectionResultType('user')).toBe('users');
    expect(getSectionResultType('stay')).toBe('hotels');
    expect(getSectionResultType('plan')).toBe('posts');
    expect(getSectionResultType('video')).toBe('reels');
    expect(getSectionResultType('lạ')).toBeNull();
  });

  it('giữ tab khi dựng URL, Tất cả thì bỏ tham số', () => {
    expect(buildInspirationHref('/inspiration', 'q=bao', { resultType: 'users' })).toBe('/inspiration?q=bao&type=users');
    expect(buildInspirationHref('/inspiration', 'q=cafe', { resultType: 'cafe' })).toBe('/inspiration?q=cafe&type=cafe');
    expect(buildInspirationHref('/inspiration', 'q=cafe&type=cafe', { resultType: 'all' })).toBe('/inspiration?q=cafe');
  });
});

describe('kiểu sắp xếp kết quả (sort)', () => {
  it('đọc giá trị hợp lệ, lạ hoặc thiếu thì Liên quan nhất', () => {
    expect(parseSearchSort('recent')).toBe('recent');
    expect(parseSearchSort('trending')).toBe('trending');
    expect(parseSearchSort('newest')).toBe('relevance');
    expect(parseSearchSort(null)).toBe('relevance');
  });

  it('giữ sort khi mở bài từ grid (bài mở cuộn đúng thứ tự grid), Liên quan nhất thì bỏ tham số', () => {
    expect(buildInspirationHref('/inspiration', 'q=dalat', { sort: 'recent' })).toBe('/inspiration?q=dalat&sort=recent');
    expect(buildInspirationHref('/inspiration', 'q=dalat&sort=recent', { openPostId: 'p1' })).toBe('/inspiration?q=dalat&sort=recent&open=p1');
    expect(buildInspirationHref('/inspiration', 'q=dalat&sort=recent', { sort: 'relevance' })).toBe('/inspiration?q=dalat');
  });

  it('thoát tìm kiếm thì bỏ sort', () => {
    expect(buildInspirationHref('/inspiration', 'q=dalat&sort=trending', { keyword: null })).toBe('/inspiration');
  });
});
