import { describe, expect, it } from 'vitest';
import { clampView, initialView, sourceRect, zoomView } from './avatar-crop';
import {
  AVATAR_FRAMES,
  AVATAR_STICKER_PRESETS,
  clampStickerNorm,
  clampStickerScale,
  createPlacedSticker,
  findStickerPreset,
} from './avatar-stickers';

describe('khung cắt avatar', () => {
  it('ảnh ngang mở ra: phủ kín khung theo chiều cao, nằm giữa; cắt đúng hình vuông giữa ảnh', () => {
    const view = initialView(300, 1200, 600);
    expect(view).toEqual({ scale: 0.5, x: -150, y: 0 });
    expect(sourceRect(view, 300)).toEqual({ sx: 300, sy: 0, size: 600 });
  });

  it('kéo quá mép thì bị giữ lại, không lộ nền trống', () => {
    const view = initialView(300, 1200, 600);
    expect(clampView({ ...view, x: 50, y: 40 }, 300, 1200, 600)).toEqual({ scale: 0.5, x: 0, y: 0 });
    expect(clampView({ ...view, x: -999 }, 300, 1200, 600).x).toBe(-300);
  });

  it('phóng to giữ tâm khung, giới hạn 1–4 lần', () => {
    const zoomed = zoomView(initialView(300, 600, 600), 2, 300, 600, 600);
    expect(sourceRect(zoomed, 300)).toEqual({ sx: 150, sy: 150, size: 300 });
    expect(zoomView(zoomed, 10, 300, 600, 600).scale).toBe(2);
    expect(zoomView(zoomed, 0.2, 300, 600, 600).scale).toBe(0.5);
  });
});

describe('phụ kiện & sticker du lịch trên avatar', () => {
  it('có đủ phụ kiện đeo, sticker du lịch và khung viền trang trí', () => {
    expect(AVATAR_STICKER_PRESETS.length).toBeGreaterThanOrEqual(10);
    expect(AVATAR_STICKER_PRESETS.some((item) => item.category === 'accessories')).toBe(true);
    expect(AVATAR_STICKER_PRESETS.some((item) => item.category === 'travel')).toBe(true);
    expect(AVATAR_FRAMES.map((frame) => frame.id)).toEqual(['none', 'sunset', 'ocean', 'passport']);
  });

  it('tạo sticker mới ở vị trí mặc định của mẫu và giữ trong biên khung cắt', () => {
    const sunglasses = findStickerPreset('sunglasses');
    expect(sunglasses).toBeDefined();
    const first = createPlacedSticker('sunglasses', 0, 's-1');
    const second = createPlacedSticker('sunglasses', 1, 's-2');
    expect(first.x).toBeCloseTo(sunglasses!.defaultX, 4);
    expect(first.y).toBeCloseTo(sunglasses!.defaultY, 4);
    expect(second.x).toBeGreaterThan(first.x);
    expect(first.isFlipped).toBe(false);
  });

  it('giới hạn tọa độ kéo và hệ số phóng to của sticker trong ngưỡng an toàn', () => {
    expect(clampStickerNorm(-0.5)).toBe(0.08);
    expect(clampStickerNorm(1.5)).toBe(0.92);
    expect(clampStickerScale(0.1)).toBe(0.5);
    expect(clampStickerScale(5)).toBe(2.2);
  });
});

