import { describe, expect, it } from 'vitest';
import { getGenieVertex, smoothGenieProgress, type GenieSurface } from './genie-motion';

const surface: GenieSurface = { left: 100, top: 120, width: 420, height: 640, anchorX: 380, anchorY: 70 };

describe('chuyển động Tripi liền mạch', () => {
  it('mở hết thì mọi điểm trở về đúng chỗ, chữ không còn biến dạng', () => {
    for (const u of [0, 0.25, 0.5, 1])
      for (const v of [0, 0.25, 0.5, 1]) {
        const point = getGenieVertex(u, v, 1, surface);
        expect(point.x).toBeCloseTo(surface.left + u * surface.width);
        expect(point.y).toBeCloseTo(surface.top + v * surface.height);
        expect(point.shade).toBeCloseTo(1);
      }
  });
  it('thu hết thì toàn bộ lưới nằm trong nút Tripi', () => {
    for (const u of [0, 0.25, 0.5, 1])
      for (const v of [0, 0.25, 0.5, 1]) {
        const point = getGenieVertex(u, v, 0, surface);
        expect(Math.abs(point.x - surface.anchorX)).toBeLessThanOrEqual(2.51);
        expect(Math.abs(point.y - surface.anchorY)).toBeLessThanOrEqual(1.51);
      }
  });
  it('nếp uốn làm biến dạng cả bên trong, không chỉ viền ngoài', () => {
    const quarter = getGenieVertex(0.25, 0.5, 0.5, surface);
    const middle = getGenieVertex(0.5, 0.5, 0.5, surface);
    const threeQuarter = getGenieVertex(0.75, 0.5, 0.5, surface);
    expect(Math.abs(middle.x - (quarter.x + threeQuarter.x) / 2)).toBeGreaterThan(0.1);
    expect(Math.abs(quarter.y - threeQuarter.y)).toBeGreaterThan(0.1);
  });
  it('vận tốc vào và ra bằng không, tiến đều khi đảo quỹ đạo', () => {
    expect(smoothGenieProgress(0)).toBe(0);
    expect(smoothGenieProgress(1)).toBe(1);
    expect(smoothGenieProgress(0.001)).toBeLessThan(0.00001);
    expect(1 - smoothGenieProgress(0.999)).toBeLessThan(0.00001);
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(smoothGenieProgress(t)).toBeCloseTo(1 - smoothGenieProgress(1 - t));
    }
  });
});
