import { describe, expect, it } from 'vitest';
import { clampView, initialView, sourceRect, zoomView } from './avatar-crop';

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
