import { describe, expect, it } from 'vitest';
import { buildPostShareUrl, buildShareChannelUrl, placeShareMenu } from './post-share';

describe('buildPostShareUrl', () => {
  it('bài viết mở trang Cảm hứng với bài mở sẵn', () => {
    expect(buildPostShareUrl('https://tripflix.io.vn', 'p1', 'vlog')).toBe('https://tripflix.io.vn/inspiration?open=p1');
  });

  it('Reel thêm kind=reel để mở trong trình xem Reels; bỏ / cuối của địa chỉ web', () => {
    expect(buildPostShareUrl('http://localhost:3100/', 'r1', 'video')).toBe(
      'http://localhost:3100/inspiration?open=r1&kind=reel',
    );
  });
});

describe('buildShareChannelUrl', () => {
  const shareUrl = 'https://tripflix.io.vn/inspiration?open=r1&kind=reel';

  it('mã hoá link (có & và ?) để mạng xã hội nhận đủ cả link', () => {
    expect(buildShareChannelUrl('facebook', shareUrl, 'Đà Lạt')).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
    expect(buildShareChannelUrl('x', shareUrl, 'Đà Lạt')).toBe(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Đà Lạt')}`,
    );
  });

  it('email đặt tiêu đề bài làm chủ đề, link trong nội dung', () => {
    expect(buildShareChannelUrl('email', shareUrl, 'Đà Lạt')).toBe(
      `mailto:?subject=${encodeURIComponent('Đà Lạt')}&body=${encodeURIComponent(shareUrl)}`,
    );
  });
});

describe('placeShareMenu', () => {
  const viewport = { width: 1600, height: 900 };
  const menu = { width: 240, height: 280 };

  it('Reels: mở sang trái nút, giữa theo chiều dọc của nút', () => {
    const anchor = { top: 500, bottom: 540, left: 1200, right: 1244 };
    expect(placeShareMenu({ anchor, menu, viewport, side: 'left' })).toEqual({ left: 950, top: 380 });
  });

  it('thẻ bài viết: mở phía trên nút; sát mép trên thì mở xuống dưới', () => {
    expect(placeShareMenu({ anchor: { top: 600, bottom: 636, left: 300, right: 360 }, menu, viewport, side: 'above' })).toEqual({
      left: 300,
      top: 310,
    });
    expect(placeShareMenu({ anchor: { top: 120, bottom: 156, left: 300, right: 360 }, menu, viewport, side: 'above' })).toEqual({
      left: 300,
      top: 166,
    });
  });

  it('luôn nằm trọn trong khung nhìn (cách mép 8px)', () => {
    const anchor = { top: 860, bottom: 890, left: 1580, right: 1600 };
    expect(placeShareMenu({ anchor, menu, viewport, side: 'above' })).toEqual({ left: 1352, top: 570 });
    expect(placeShareMenu({ anchor: { top: 10, bottom: 40, left: 100, right: 140 }, menu, viewport, side: 'left' })).toEqual({
      left: 8,
      top: 8,
    });
  });
});
