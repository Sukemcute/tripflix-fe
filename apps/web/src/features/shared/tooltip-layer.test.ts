import { describe, expect, it } from 'vitest';
import { placeTooltip } from './tooltip-layer';

const viewport = { width: 1440 };
const tip = { width: 120, height: 28 };

describe('vị trí chú thích', () => {
  it('đặt giữa, phía trên phần tử khi đủ chỗ', () => {
    const place = placeTooltip({ left: 500, top: 200, width: 100, bottom: 240 }, tip, viewport);
    expect(place).toEqual({ left: 490, top: 164, side: 'top' });
  });

  it('sát mép trên màn hình thì xuống dưới phần tử', () => {
    const place = placeTooltip({ left: 500, top: 10, width: 100, bottom: 50 }, tip, viewport);
    expect(place).toEqual({ left: 490, top: 58, side: 'bottom' });
  });

  it('không tràn mép trái, mép phải', () => {
    expect(placeTooltip({ left: 0, top: 200, width: 20, bottom: 220 }, tip, viewport).left).toBe(8);
    expect(placeTooltip({ left: 1430, top: 200, width: 10, bottom: 220 }, tip, viewport).left).toBe(1312);
  });
});
