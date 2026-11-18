import { describe, expect, it } from 'vitest';
import { getClippedHighlightRect, getVisiblePostRect } from './highlight-rect';

const viewport = { top: 100, bottom: 700, left: 200, right: 900 };

describe('viền bài highlight khi cuộn qua khung bo góc', () => {
  it('bóng hover chỉ bao quanh thẻ đang trỏ chuột, không kéo dài qua khoảng cách giữa bài', () => {
    expect(getVisiblePostRect(viewport, { ...viewport, top: 150, bottom: 400 })).toEqual({
      top: 50,
      left: 0,
      width: 700,
      height: 250,
    });
  });
  it('vẽ lại viền ở mép trên khi đầu bài đã cuộn ra ngoài', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: -100, bottom: 550 })).toEqual({
      top: 0,
      left: 0,
      width: 700,
      height: 450,
    });
  });
  it('vẽ lại mép dưới cho bài đang đi vào vùng cuộn', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: 500, bottom: 900 })).toEqual({
      top: 400,
      left: 0,
      width: 700,
      height: 200,
    });
  });
  it('bài dài hơn khung có đủ viền ở cả hai mép', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: -100, bottom: 1000 })).toEqual({
      top: 0,
      left: 0,
      width: 700,
      height: 600,
    });
  });
  it('giữ viền gốc khi toàn bộ thẻ đã nằm trong vùng cuộn', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: 150, bottom: 650 })).toBeNull();
    expect(getClippedHighlightRect(viewport, viewport)).toBeNull();
  });
  it('không vẽ viền cho bài ngoài màn hình', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: -200, bottom: 100 })).toBeNull();
    expect(getClippedHighlightRect(viewport, { ...viewport, top: 700, bottom: 900 })).toBeNull();
  });
  it('không vẽ đè lên thanh quay lại kết quả tìm kiếm', () => {
    expect(getClippedHighlightRect(viewport, { ...viewport, top: 120, bottom: 550 }, 160)).toEqual({
      top: 60,
      left: 0,
      width: 700,
      height: 390,
    });
  });
});
