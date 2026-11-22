import { describe, expect, it } from 'vitest';
import { clampView, initialView, sourceRect, zoomView } from './avatar-crop';
import {
  AVATAR_FRAMES,
  AVATAR_STICKER_PRESETS,
  clampStickerNorm,
  clampStickerScale,
  createPlacedSticker,
  findStickerPreset,
  fitStickerInStage,
  snapStickerToOuterRim,
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

describe('khung bọc ngoài & phụ kiện tràn viền trên avatar', () => {
  it('có đủ khung thú bọc ngoài kiểu Discord và phụ kiện du lịch', () => {
    expect(AVATAR_STICKER_PRESETS.length).toBeGreaterThanOrEqual(10);
    expect(AVATAR_STICKER_PRESETS.some((item) => item.category === 'accessories')).toBe(true);
    expect(AVATAR_STICKER_PRESETS.some((item) => item.category === 'travel')).toBe(true);
    expect(AVATAR_FRAMES.map((frame) => frame.id)).toEqual([
      'none',
      'fox-hat',
      'rose-pink',
      'rose-blue',
      'midnight-sorceress',
      'tripi-hood',
      'tropical-wreath',
    ]);
    expect(
      AVATAR_FRAMES.filter((frame) => frame.id !== 'none').every((frame) => Boolean(frame.overlaySrc)),
    ).toBe(true);
  });

  it('tạo sticker mới ở vị trí mặc định của mẫu và cho phép đẩy ra viền ngoài khung tròn', () => {
    const sunglasses = findStickerPreset('sunglasses');
    expect(sunglasses).toBeDefined();
    const first = createPlacedSticker('sunglasses', 0, 's-1');
    const second = createPlacedSticker('sunglasses', 1, 's-2');
    expect(first.x).toBeCloseTo(sunglasses!.defaultX, 4);
    expect(first.y).toBeCloseTo(sunglasses!.defaultY, 4);
    expect(second.x).toBeGreaterThan(first.x);
    const snapped = snapStickerToOuterRim({ ...first, x: 0.8, y: 0.5 });
    expect(snapped.x).toBeCloseTo(1.04, 2);
    expect(snapped.y).toBeCloseTo(0.5, 2);
  });

  it('cho phép tọa độ kéo tràn ra ngoài mép hình tròn (-0.18..1.18) và giữ hệ số phóng to an toàn', () => {
    expect(clampStickerNorm(-0.5)).toBe(-0.18);
    expect(clampStickerNorm(1.5)).toBe(1.18);
    expect(clampStickerScale(0.1)).toBe(0.5);
    expect(clampStickerScale(5)).toBe(2.4);
  });

  it('phụ kiện kéo hay phóng to không tràn ra khỏi vùng chỉnh', () => {
    const sticker = { ...createPlacedSticker('camera', 0, 's1'), x: -1, y: 2 };
    // Vùng chỉnh 360px, khung tròn 240px ở giữa (đệm 60px), phụ kiện 80px: tâm chỉ đi được từ -20px tới 260px.
    const fitted = fitStickerInStage(sticker, 80, 240, 360);
    expect(fitted.x * 240).toBeCloseTo(-20);
    expect(fitted.y * 240).toBeCloseTo(260);
    // Phụ kiện to hơn vùng chỉnh thì đặt giữa.
    const huge = fitStickerInStage(sticker, 500, 240, 360);
    expect(huge.x).toBeCloseTo(0.5);
    expect(huge.y).toBeCloseTo(0.5);
  });
});
